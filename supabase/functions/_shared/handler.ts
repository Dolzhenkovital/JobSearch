import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AppError, object, text, parseConfig, parseInput, providerRequest, providerOutput,
  validateMatch, validateTailor, RULES_VERSION, type Operation,
} from './llm.ts';

type Dependencies = {
  admin: SupabaseClient; siteUrl: string; allowedOrigins: string[];
  fetch: typeof fetch; resolveAddresses: (host: string) => Promise<string[]>;
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ERROR_CODES=['admin_required','config_conflict','request_conflict','llm_unconfigured','budget_exceeded',
  'request_in_progress','input_too_large','admin_delete_protected','action_rate_limited'];
function databaseError(message:string): never {
  const code=ERROR_CODES.find(x=>message.includes(x));
  throw new AppError(code||'storage_error',code==='admin_required'?403:code?409:503);
}
export function publicAddress(ip:string):boolean {
  if(ip.includes(':')) {
    // Permit ordinary globally routed IPv6 only; reject mapped/compatible and local forms.
    return /^[23][0-9a-f]{0,3}:/i.test(ip) && !/^2001:(db8|0):/i.test(ip);
  }
  const parts=ip.split('.').map(Number);
  if(parts.length!==4||parts.some(x=>!Number.isInteger(x)||x<0||x>255))return false;
  const [a,b]=parts;
  return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||
    (a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0))||(a===198&&(b===18||b===19)));
}
async function boundedJson(response:Response,max=1_000_000):Promise<unknown> {
  const reader=response.body?.getReader();
  if(!reader)throw new AppError('invalid_output',502);
  let size=0;const chunks:Uint8Array[]=[];
  try { while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;
    if(size>max)throw new AppError('response_too_large',502);chunks.push(part.value);}
  } finally {await reader.cancel().catch(()=>{});}
  const buffer=new Uint8Array(size);let offset=0;
  for(const part of chunks){buffer.set(part,offset);offset+=part.length;}
  try{return JSON.parse(new TextDecoder().decode(buffer));}catch{throw new AppError('invalid_json');}
}
async function hash(value:string) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function createHandler(deps:Dependencies) {
  const {admin}=deps;
  async function rpc(name:string,args:Record<string,unknown>={}) {
    const {data,error}=await admin.rpc(name,args);
    if(error)databaseError(error.message);
    return data;
  }
  async function isAdmin(id:string) {
    const {data,error}=await admin.from('app_admins').select('user_id').eq('user_id',id).maybeSingle();
    if(error)throw new AppError('storage_error',503);
    return !!data;
  }
  return async (request:Request):Promise<Response>=>{
    const origin=request.headers.get('origin');
    const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
    if(origin&&deps.allowedOrigins.includes(origin))headers['Access-Control-Allow-Origin']=origin;
    headers['Access-Control-Allow-Headers']='authorization, apikey, content-type, x-client-info';
    headers['Access-Control-Allow-Methods']='POST, OPTIONS';
    const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
    if(origin&&!deps.allowedOrigins.includes(origin))return reply({error:'origin_not_allowed'},403);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(request.method!=='POST')return reply({error:'method_not_allowed'},405);
    try {
      const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
      if(!token)throw new AppError('authentication_required',401);
      const {data:auth,error:authError}=await admin.auth.getUser(token);
      if(authError||!auth.user||!auth.user.email_confirmed_at)throw new AppError('authentication_required',401);
      const user=auth.user;
      const body=object(await boundedJson(new Response(request.body),180000));
      const action=text(body.action,60);
      if(['list_users','reset_password','delete_user','get_config','save_config'].includes(action)&&!await isAdmin(user.id))
        throw new AppError('admin_required',403);
      if(action==='status') {
        await rpc('llm_reconcile_expired',{p_user:user.id});
        const settings=await rpc('llm_server_config');
        const month=new Date().toISOString().slice(0,7)+'-01';
        const {data:usage,error}=await admin.from('llm_usage').select('used_tokens,reserved_tokens,month').eq('user_id',user.id).eq('month',month).maybeSingle();
        if(error)throw new AppError('storage_error',503);
        return reply({isAdmin:await isAdmin(user.id),configured:!!settings.apiKey&&!!settings.config.model,
          monthlyTokenBudget:settings.config.monthlyTokenBudget,usage:usage||{used_tokens:0,reserved_tokens:0,month}});
      }
      if(action==='get_config') {
        const settings=await rpc('llm_server_config');
        return reply({...settings.config,revision:settings.revision,keyConfigured:!!settings.apiKey});
      }
      if(action==='save_config') {
        const config=parseConfig(body.config);
        const key=body.apiKey===undefined||body.apiKey===''?null:text(body.apiKey,16000);
        if(key&&/[\r\n]/.test(key))throw new AppError('invalid_api_key');
        const previous=await rpc('llm_server_config');
        if(new URL(previous.config.baseUrl).origin!==new URL(config.baseUrl).origin&&!key)throw new AppError('new_host_needs_key');
        if(!Number.isSafeInteger(body.revision))throw new AppError('invalid_input');
        const revision=await rpc('llm_save_config',{p_actor:user.id,p_config:config,p_api_key:key,p_revision:body.revision});
        return reply({...config,revision,keyConfigured:!!(key||previous.apiKey)});
      }
      if(action==='list_users') {
        const page=Number(body.page||1);
        if(!Number.isInteger(page)||page<1||page>10000)throw new AppError('invalid_input');
        const {data,error}=await admin.auth.admin.listUsers({page,perPage:50});
        if(error)throw new AppError('users_unavailable',503);
        const {data:admins,error:roleError}=await admin.from('app_admins').select('user_id');
        if(roleError)throw new AppError('storage_error',503);
        const ids=new Set((admins||[]).map(a=>a.user_id));
        return reply({users:data.users.map(u=>({id:u.id,email:u.email||'',createdAt:u.created_at,
          lastSignInAt:u.last_sign_in_at||null,confirmed:!!u.email_confirmed_at,isAdmin:ids.has(u.id)})),
          page,total:'total' in data?data.total:null,hasMore:data.users.length===50});
      }
      if(action==='reset_password'||action==='delete_user') {
        const target=text(body.userId,36);if(!UUID.test(target))throw new AppError('invalid_input');
        const {data,error}=await admin.auth.admin.getUserById(target);
        if(error||!data.user?.email)throw new AppError('user_not_found',404);
        if(action==='delete_user'&&body.confirmEmail!==data.user.email)throw new AppError('confirmation_required');
        await rpc('admin_action_guard',{p_actor:user.id,p_target:target,p_action:action});
        const result=action==='reset_password'
          ?await admin.auth.resetPasswordForEmail(data.user.email,{redirectTo:deps.siteUrl})
          :await admin.auth.admin.deleteUser(target);
        if(result.error)throw new AppError(action==='reset_password'?'recovery_email_failed':'delete_failed',502);
        return reply({ok:true});
      }
      if(action==='runs') {
        const jobId=text(body.jobId,300);
        const {data,error}=await admin.from('llm_runs').select('*').eq('user_id',user.id)
          .contains('input',{job:{id:jobId}}).order('created_at',{ascending:false}).limit(30);
        if(error)throw new AppError('storage_error',503);
        return reply({runs:data});
      }
      if(action!=='match'&&action!=='tailor')throw new AppError('unknown_action');
      const operation:Operation=action;
      const id=text(body.requestId,36);if(!UUID.test(id))throw new AppError('invalid_input');
      const input=parseInput(body.input,operation);
      const inputHash=await hash(JSON.stringify({operation,input,rules:RULES_VERSION}));
      // Idempotent replay is resolved before config/DNS, including after an admin config change.
      const {data:existing,error:lookupError}=await admin.from('llm_runs').select('*').eq('id',id).eq('user_id',user.id).maybeSingle();
      if(lookupError)throw new AppError('storage_error',503);
      if(existing){if(existing.input_hash!==inputHash)throw new AppError('request_conflict',409);return reply({run:existing});}
      const settings=await rpc('llm_server_config');
      if(!settings.apiKey||!settings.config.model)throw new AppError('llm_unconfigured',409);
      const config=parseConfig(settings.config);
      const addresses=await deps.resolveAddresses(new URL(config.baseUrl).hostname);
      if(!addresses.length||addresses.some(ip=>!publicAddress(ip)))throw new AppError('provider_address_blocked');
      const provider=providerRequest(config,operation,input);
      await rpc('llm_reconcile_expired',{p_user:user.id});
      const reservation=await rpc('llm_reserve',{p_id:id,p_user:user.id,p_operation:operation,p_hash:inputHash,
        p_input:input,p_reserve:provider.reserve,p_config_revision:settings.revision,p_rules:RULES_VERSION});
      if(!reservation.created)return reply({run:reservation.run});
      let inputTokens:number|null=null,outputTokens:number|null=null,dispatchStarted=false;
      try {
        dispatchStarted=true;
        const response=await deps.fetch(provider.url,{method:'POST',headers:{Authorization:`Bearer ${settings.apiKey}`,'Content-Type':'application/json'},
          body:JSON.stringify(provider.body),redirect:'error',signal:AbortSignal.timeout(110000)});
        if(!response.ok){
          // Definite request rejection has no generated response; ambiguous server errors remain charged conservatively.
          if([400,401,403,404,422,429].includes(response.status)){inputTokens=0;outputTokens=0;}
          await response.body?.cancel();
          throw new AppError(response.status===429?'provider_rate_limited':response.status===401||response.status===403?'provider_auth_failed':
            response.status===400||response.status===422?'provider_parameters_rejected':'provider_unavailable',502);
        }
        const raw=await boundedJson(response);
        // Account for reported usage even if the content is refused, incomplete, or invalid.
        const rawUsage=object(raw).usage;
        if(rawUsage){const u=object(rawUsage);const i=config.apiFormat==='responses'?u.input_tokens:u.prompt_tokens;
          const o=config.apiFormat==='responses'?u.output_tokens:u.completion_tokens;
          if(Number.isSafeInteger(i)&&Number(i)>=0)inputTokens=Number(i);
          if(Number.isSafeInteger(o)&&Number(o)>=0)outputTokens=Number(o);}
        const output=providerOutput(raw,config.apiFormat);
        const result=operation==='match'?validateMatch(output.value,input):validateTailor(output.value,input);
        const run=await rpc('llm_complete',{p_id:id,p_status:'succeeded',p_result:result,p_error:null,p_input_tokens:inputTokens,p_output_tokens:outputTokens});
        return reply({run});
      }catch(error){
        const code=error instanceof AppError?error.code:'provider_interrupted';
        const uncertain=dispatchStarted&&(inputTokens===null||outputTokens===null);
        const run=await rpc('llm_complete',{p_id:id,p_status:uncertain?'uncertain':'failed',p_result:null,p_error:code,
          p_input_tokens:inputTokens,p_output_tokens:outputTokens});
        return reply({run});
      }
    }catch(error){
      return reply({error:error instanceof AppError?error.code:'service_unavailable'},error instanceof AppError?error.status:503);
    }
  };
}

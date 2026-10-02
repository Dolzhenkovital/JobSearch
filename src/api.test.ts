import {beforeEach,describe,it,expect,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createHandler} from '../supabase/functions/_shared/handler';
const uid='00000000-0000-4000-8000-000000000001',rid='00000000-0000-4000-8000-000000000011';
let allowed=false,existing:unknown=null;
const listUsers=vi.fn(),deleteUser=vi.fn(),recovery=vi.fn(),provider=vi.fn(),rpc=vi.fn();
const getUser=vi.fn();
const query=(table:string)=>{
  const chain={select:()=>chain,eq:()=>chain,maybeSingle:async()=>({data:table==='app_admins'?(allowed?{user_id:uid}:null):existing,error:null})};
  return chain;
};
const admin={auth:{getUser,resetPasswordForEmail:recovery,admin:{listUsers,deleteUser,getUserById:vi.fn()}},from:query,rpc} as unknown as SupabaseClient;
const config={baseUrl:'https://api.example.com/v1',model:'synthetic',apiFormat:'responses',reasoningEffort:'default',monthlyTokenBudget:0};
const input={profileVersion:1,evidence:[{id:'cv:1',text:'Prepared Excel reports.'}],job:{id:'synthetic:1',title:'Assistant',employer:'Example',description:'Excel required.',completeness:'full',availability:'unknown',location:'',salary:''},preferences:{city:'',roles:'',minHourly:'',applyPreferences:false},documentLanguage:'en'};
const make=(resolveAddresses=async()=>['8.8.8.8'])=>createHandler({admin,siteUrl:'https://example.com/app/',allowedOrigins:['https://example.com'],fetch:provider,resolveAddresses});
const request=(action:string,extra:Record<string,unknown>={},authenticated=true)=>new Request('https://example.com/functions/v1/jobsearch-api',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://example.com',...(authenticated?{Authorization:'Bearer synthetic-user-token'}:{})},body:JSON.stringify({action,...extra})});
beforeEach(()=>{
  vi.resetAllMocks();allowed=false;existing=null;
  getUser.mockResolvedValue({data:{user:{id:uid,email_confirmed_at:'2026-10-01T00:00:00Z'}},error:null});
  rpc.mockImplementation(async(name:string,args:Record<string,unknown>)=>{
    if(name==='llm_server_config')return {data:{config,revision:1,apiKey:'synthetic-private-key'},error:null};
    if(name==='llm_reserve')return {data:{created:true,run:{id:rid}},error:null};
    if(name==='llm_complete')return {data:{id:rid,status:args.p_status,error_code:args.p_error,result:args.p_result},error:null};
    return {data:null,error:null};
  });
});
describe('server authentication and provider boundary',()=>{
  it('rejects unauthenticated and non-admin access before privileged actions',async()=>{
    expect((await make()(request('list_users',{},false))).status).toBe(401);
    for(const action of ['list_users','get_config','save_config','delete_user','reset_password'])
      expect((await make()(request(action))).status).toBe(403);
    expect(listUsers).not.toHaveBeenCalled();expect(deleteUser).not.toHaveBeenCalled();expect(rpc).not.toHaveBeenCalled();
  });
  it('never returns the API key to the admin browser',async()=>{
    allowed=true;
    const response=await make()(request('get_config'));const result=await response.json();
    expect(result.keyConfigured).toBe(true);expect(JSON.stringify(result)).not.toContain('synthetic-private-key');
    expect(result).not.toHaveProperty('apiKey');
  });
  it('blocks a private resolved host before reserving tokens or transmitting a key',async()=>{
    const response=await make(async()=>['127.0.0.1'])(request('match',{requestId:rid,input}));
    expect(response.status).toBe(400);expect(provider).not.toHaveBeenCalled();
    expect(rpc.mock.calls.some(([name])=>name==='llm_reserve')).toBe(false);
  });
  it('preserves an uncertain timeout with conservative accounting and no automatic retry',async()=>{
    provider.mockRejectedValue(new DOMException('timeout','TimeoutError'));
    const response=await make()(request('match',{requestId:rid,input}));
    expect((await response.json()).run.status).toBe('uncertain');
    expect(provider).toHaveBeenCalledTimes(1);
    expect(provider.mock.calls[0][1].redirect).toBe('error');
    const settlement=rpc.mock.calls.find(([name])=>name==='llm_complete')![1];
    expect(settlement.p_input_tokens).toBeNull();expect(settlement.p_output_tokens).toBeNull();
  });
  it('accounts for actual tokens even when the model invents evidence',async()=>{
    provider.mockResolvedValue(Response.json({status:'completed',usage:{input_tokens:123,output_tokens:456},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({summary:'Report',requirements:[{requirement:'Excel',jobQuote:'Excel required.',category:'skills',importance:'required',status:'supported',evidenceIds:['invented'],explanation:'Unsupported.'}],questions:[],preferenceConflicts:[]})}]}]}));
    const result=await (await make()(request('match',{requestId:rid,input}))).json();
    expect(result.run.status).toBe('failed');expect(result.run.error_code).toBe('unsupported_evidence');
    const settlement=rpc.mock.calls.find(([name])=>name==='llm_complete')![1];
    expect(settlement.p_input_tokens).toBe(123);expect(settlement.p_output_tokens).toBe(456);
  });
});

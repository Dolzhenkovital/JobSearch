import { cloud } from './cloud';
import { getLanguage, t, type MessageKey } from './i18n';
import { uk } from './i18n/uk';
import { evidenceFromProfile, type LlmInput, type MatchResult, type TailorResult } from '../supabase/functions/_shared/llm';
import type { Job, Profile, Settings } from './types';
export type { PublicLlmConfig, LlmConfig, LlmInput, MatchResult, TailorResult } from '../supabase/functions/_shared/llm';
export { EFFORTS } from '../supabase/functions/_shared/llm';
export type {SmtpConfig,SmtpState} from '../supabase/functions/_shared/smtp';
export type ServiceStatus={isAdmin:boolean;configured:boolean;monthlyTokenBudget:number;usage:{used_tokens:number;reserved_tokens:number;month:string}};
export type Account={id:string;email:string;createdAt:string;lastSignInAt:string|null;confirmed:boolean;isAdmin:boolean};
export type LlmRun={id:string;user_id:string;operation:'match'|'tailor';status:'pending'|'succeeded'|'failed'|'uncertain';
  input:LlmInput;result:MatchResult|TailorResult|null;model:string;rules_version:string;created_at:string;
  input_hash:string;error_code:string|null;charged_tokens:number|null;usage_estimated:boolean};
export const serviceMessage=(code:string)=>{
  const key=`service.${code}`;
  return key in uk?t(key as MessageKey):t('service.default');
};
export async function serviceCall<T>(action:string,payload:Record<string,unknown>={}):Promise<T>{
  if(!cloud)throw new Error(t('service.notConnected'));
  const {data,error}=await cloud.functions.invoke('jobsearch-api',{body:{action,...payload}});
  if(error){
    let code='service_unavailable';
    if(error.context instanceof Response){try{code=(await error.context.json()).error||code;}catch{/* no public raw provider errors */}}
    throw new Error(serviceMessage(code));
  }
  if(data?.error)throw new Error(serviceMessage(data.error));
  return data as T;
}
export function makeLlmInput(job:Job,profile:Profile,settings:Settings):LlmInput{
  return {profileVersion:profile.version,evidence:evidenceFromProfile(profile),
    job:{id:job.id,title:job.title,employer:job.employer,description:job.description,completeness:job.completeness,
      availability:job.availability,location:job.location,salary:job.salary},
    preferences:{city:settings.city,roles:settings.roles,minHourly:settings.minHourly,applyPreferences:settings.applyPreferences},
    documentLanguage:settings.documentLanguage,interfaceLanguage:getLanguage()};
}

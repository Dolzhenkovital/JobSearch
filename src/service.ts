import { cloud } from './cloud';
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
const messages:Record<string,string>={
  smtp_management_required:'Введіть Supabase Management Token, щоб застосувати SMTP.',
  smtp_management_failed:'Не вдалося прочитати поштові налаштування. Перевірте доступ токена до цього проєкту.',
  smtp_update_failed:'Supabase відхилив поштові налаштування. Перевірте параметри та права токена.',
  smtp_update_uncertain:'Результат застосування невідомий. Спочатку завантажте поточні налаштування й перевірте їх перед повтором.',
  smtp_password_required:'Введіть пароль SMTP. Новий сервер або логін потребує нового пароля.',
  invalid_smtp_host:'Введіть домен SMTP-сервера без протоколу й номера порту.',
  invalid_smtp_port:'Номер порту має бути від 1 до 65535.',
  authentication_required:'Увійдіть у підтверджений акаунт.',admin_required:'Ця дія доступна лише адміністратору.',
  llm_unconfigured:'Адміністратор ще не налаштував LLM.',budget_exceeded:'Недостатньо місячного ліміту для цього запиту. Ліміт враховує резерв на відповідь.',
  request_in_progress:'Інший ваш запит ще обробляється. Оновіть історію трохи пізніше.',config_conflict:'Налаштування вже змінилися. Оновіть їх перед збереженням.',
  action_rate_limited:'Цю дію вже виконували щойно. Спробуйте через хвилину.',admin_delete_protected:'Видалення адміністратора через цю панель заборонене.',
  recovery_email_failed:'Не вдалося надіслати лист. Перевірте SMTP і ліміти пошти Supabase.',delete_failed:'Не вдалося видалити акаунт.',
  invalid_base_url:'Вкажіть публічний HTTPS API Base URL без параметрів, облікових даних чи нестандартного порту.',
  base_url_not_endpoint:'Вкажіть базову адресу API, наприклад https://api.openai.com/v1, без /responses або /chat/completions.',
  new_host_needs_key:'Для іншого API-хоста потрібно ввести його API Key.',provider_address_blocked:'API-хост не має дозволеної публічної адреси.',
  provider_rate_limited:'Провайдер обмежив частоту запитів. Спробуйте пізніше.',provider_auth_failed:'Провайдер відхилив API Key. Зверніться до адміністратора.',
  provider_parameters_rejected:'Провайдер відхилив параметри. Перевірте модель, API Format, Reasoning Effort і підтримку JSON Schema.',
  provider_incomplete:'Провайдер не завершив відповідь. Готовий пакет не створено.',provider_refused:'Провайдер відмовився обробити запит.',
  provider_interrupted:'Зв’язок із провайдером перервався. Запит не повторюється автоматично; можливу витрату токенів збережено.',
  interrupted:'Запит перервався. Можливу витрату враховано за резервом; автоматичного повтору немає.',
  invalid_output:'Відповідь LLM має неправильний формат. Чернетку не прийнято.',unsupported_evidence:'LLM повернув твердження без правильних посилань на факти. Чернетку не прийнято.',
  unsupported_job_quote:'LLM послався на текст, якого немає у вакансії.',letter_too_long:'LLM перевищив ліміт 250 слів для листа.',
  full_open_job_required:'Для адаптації потрібна відкрита вакансія з повним описом.',profile_required:'Спочатку додайте CV у профіль.',
  input_too_large:'Забагато тексту для одного запиту. Скоротіть нерелевантні частини CV або опису.',
};
export const serviceMessage=(code:string)=>messages[code]||'Сервіс тимчасово недоступний. Збережені дані залишаються у вашому просторі.';
export async function serviceCall<T>(action:string,payload:Record<string,unknown>={}):Promise<T>{
  if(!cloud)throw new Error('Синхронізація не підключена.');
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
    documentLanguage:settings.documentLanguage};
}

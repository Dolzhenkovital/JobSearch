import {AppError,object,text} from './llm.ts';

export type SmtpConfig={host:string;port:number;username:string;senderEmail:string;senderName:string};
export type SmtpState={managementConfigured:boolean;config:SmtpConfig|null;passwordConfigured:boolean};
export function parseSmtp(value:unknown):SmtpConfig {
  const v=object(value),host=text(v.host,253).trim().toLowerCase();
  if(!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(host)||/\.(local|internal|localhost|invalid|test)$/.test(host))throw new AppError('invalid_smtp_host');
  if(!Number.isInteger(v.port)||Number(v.port)<1||Number(v.port)>65535)throw new AppError('invalid_smtp_port');
  const senderEmail=text(v.senderEmail,320).trim(),senderName=text(v.senderName,200).trim(),username=text(v.username,500).trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)||[senderName,username].some(x=>/[\r\n]/.test(x)))throw new AppError('invalid_input');
  return {host,port:Number(v.port),username,senderEmail,senderName};
}
export function smtpView(raw:unknown,managementConfigured:boolean):SmtpState {
  const v=object(raw);
  const field=(name:string)=>typeof v[name]==='string'?v[name] as string:'';
  return {managementConfigured,passwordConfigured:!!v.smtp_pass,config:{host:field('smtp_host'),port:Number(v.smtp_port)||587,
    username:field('smtp_user'),senderEmail:field('smtp_admin_email'),senderName:field('smtp_sender_name')}};
}
export function smtpPatch(config:SmtpConfig,password:string,previous:SmtpState):Record<string,string> {
  if(!password&&(!previous.passwordConfigured||previous.config?.host!==config.host||previous.config?.username!==config.username))
    throw new AppError('smtp_password_required');
  // Only SMTP fields: never modify signup, JWT, redirect or confirmation policy.
  return {smtp_host:config.host,smtp_port:String(config.port),smtp_user:config.username,
    smtp_admin_email:config.senderEmail,smtp_sender_name:config.senderName,...(password?{smtp_pass:password}:{})};
}

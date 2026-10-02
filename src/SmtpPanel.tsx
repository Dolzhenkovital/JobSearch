import {useEffect,useRef,useState} from 'react';
import {RefreshCw,Save} from 'lucide-react';
import {Field,ExternalLink} from './ui';
import {useI18n} from './i18n';
import {serviceCall,type SmtpConfig,type SmtpState} from './service';

const blank:SmtpConfig={host:'',port:587,username:'',senderEmail:'',senderName:'JobSearch'};
export function SmtpPanel({notify,request=serviceCall}:{notify:(s:string)=>void;request?:typeof serviceCall}){
  const {t}=useI18n();
  const [config,setConfig]=useState(blank),[server,setServer]=useState<SmtpState|null>(null);
  const [password,setPassword]=useState(''),[token,setToken]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const active=useRef(true);
  // Load once on mount; later reloads are explicit.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{active.current=true;void load();return()=>{active.current=false;};},[]);
  async function load(){
    setBusy(true);setError('');
    try{const value=await request<SmtpState>('get_smtp',{managementToken:token});if(active.current){setServer(value);if(value.config)setConfig(value.config);setPassword('');}}
    catch(e){if(active.current)setError((e as Error).message);}finally{if(active.current)setBusy(false);}
  }
  const access=!!server?.managementConfigured||!!token.trim();
  return <form onSubmit={async event=>{
    event.preventDefault();setBusy(true);setError('');
    try{const value=await request<SmtpState>('save_smtp',{config,password,managementToken:token});
      if(active.current){setServer(value);if(value.config)setConfig(value.config);notify(t('smtp.applied'));}}
    catch(e){if(active.current)setError((e as Error).message);}finally{if(active.current){setBusy(false);setToken('');setPassword('');}}
  }}>
    <h3>{t('smtp.title')}</h3>
    <p className="form-note">{t('smtp.note')}</p>
    {!server?.managementConfigured&&<div className="notice">
      <Field label="Supabase Management Token" hint={t('smtp.token.hint')}><input type="password" autoComplete="new-password" value={token} onChange={e=>setToken(e.target.value)} required disabled={busy}/></Field>
      <p className="form-note">{t('smtp.token.note')}</p>
      <ExternalLink href="https://supabase.com/dashboard/account/tokens">{t('smtp.token.link')}</ExternalLink>
    </div>}
    <div className="button-row"><button type="button" className="button secondary small" disabled={busy||!access} onClick={()=>void load()}><RefreshCw size={15}/>{t('smtp.load')}</button></div>
    <p className="form-note">{t(server?.config?(server.config.host?'smtp.loaded.custom':'smtp.loaded.none'):'smtp.notLoaded')}</p>
    <div className="form-grid"><Field label="SMTP Host"><input required value={config.host} placeholder="smtp.example.com" disabled={busy} onChange={e=>setConfig({...config,host:e.target.value})}/></Field>
      <Field label="SMTP Port" hint={t('smtp.port.hint')}><input type="number" min="1" max="65535" step="1" required value={config.port} disabled={busy} onChange={e=>setConfig({...config,port:Number(e.target.value)})}/></Field></div>
    <Field label="SMTP Username"><input required autoComplete="off" value={config.username} disabled={busy} onChange={e=>setConfig({...config,username:e.target.value})}/></Field>
    <Field label="SMTP Password" hint={t(server?.passwordConfigured?'smtp.password.hintSaved':'smtp.password.hintNew')}><input type="password" autoComplete="new-password" required={!server?.passwordConfigured} value={password} disabled={busy} onChange={e=>setPassword(e.target.value)}/></Field>
    <Field label={t('smtp.senderEmail')}><input type="email" required value={config.senderEmail} placeholder="no-reply@example.com" disabled={busy} onChange={e=>setConfig({...config,senderEmail:e.target.value})}/></Field>
    <Field label={t('smtp.senderName')}><input required value={config.senderName} disabled={busy} onChange={e=>setConfig({...config,senderName:e.target.value})}/></Field>
    {error&&<div role="alert" className="notice error">{error}</div>}
    <button className="button primary" disabled={busy||!access}><Save size={17}/>{busy?t('common.processing'):t('smtp.apply')}</button>
  </form>;
}

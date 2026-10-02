import {useEffect,useRef,useState} from 'react';
import {RefreshCw,Save} from 'lucide-react';
import {Field,ExternalLink} from './ui';
import {serviceCall,type SmtpConfig,type SmtpState} from './service';

const blank:SmtpConfig={host:'',port:587,username:'',senderEmail:'',senderName:'JobSearch'};
export function SmtpPanel({notify,request=serviceCall}:{notify:(s:string)=>void;request?:typeof serviceCall}){
  const [config,setConfig]=useState(blank),[server,setServer]=useState<SmtpState|null>(null);
  const [password,setPassword]=useState(''),[token,setToken]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const active=useRef(true);
  useEffect(()=>{active.current=true;void load();return()=>{active.current=false;};},[]);
  async function load(){
    setBusy(true);setError('');
    try{const value=await request<SmtpState>('get_smtp',{managementToken:token});if(active.current){setServer(value);if(value.config)setConfig(value.config);setPassword('');}}
    catch(e){if(active.current)setError((e as Error).message);}finally{if(active.current)setBusy(false);}
  }
  const access=!!server?.managementConfigured||!!token.trim();
  return <form onSubmit={async e=>{
    e.preventDefault();setBusy(true);setError('');
    try{const value=await request<SmtpState>('save_smtp',{config,password,managementToken:token});
      if(active.current){setServer(value);if(value.config)setConfig(value.config);notify('SMTP застосовано в Supabase. Доставку листів потрібно перевірити окремо.');}}
    catch(e){if(active.current)setError((e as Error).message);}finally{if(active.current){setBusy(false);setToken('');setPassword('');}}
  }}>
    <h3>Пошта для реєстрації та відновлення</h3>
    <p className="form-note">Налаштування застосовуються до Supabase Auth. Збереження не надсилає тестового листа. Заповніть ці поля, коли оберете поштового провайдера.</p>
    {!server?.managementConfigured&&<div className="notice">
      <Field label="Supabase Management Token" hint="Потрібен для застосування налаштувань до цього проєкту. Це токен керування Supabase, а не SMTP-пароль чи публічний ключ."><input type="password" autoComplete="new-password" value={token} onChange={e=>setToken(e.target.value)} required disabled={busy}/></Field>
      <p className="form-note">Токен використовується лише для цього налаштування, не зберігається в базі або браузерному сховищі та очищується після застосування. Доступ обмежте цим проєктом і читанням/зміною Auth config.</p>
      <ExternalLink href="https://supabase.com/dashboard/account/tokens">Відкрити токени Supabase</ExternalLink>
    </div>}
    <div className="button-row"><button type="button" className="button secondary small" disabled={busy||!access} onClick={()=>void load()}><RefreshCw size={15}/>Завантажити поточні налаштування</button></div>
    {server?.config?<p className="form-note">{server.config.host?'Завантажено налаштування власного SMTP.':'Власний SMTP ще не задано.'}</p>:<p className="form-note">Поточні параметри Supabase ще не завантажені.</p>}
    <div className="form-grid"><Field label="SMTP Host"><input required value={config.host} placeholder="smtp.example.com" disabled={busy} onChange={e=>setConfig({...config,host:e.target.value})}/></Field>
      <Field label="SMTP Port" hint="Зазвичай 587 або 465; використайте порт вашого провайдера."><input type="number" min="1" max="65535" step="1" required value={config.port} disabled={busy} onChange={e=>setConfig({...config,port:Number(e.target.value)})}/></Field></div>
    <Field label="SMTP Username"><input required autoComplete="off" value={config.username} disabled={busy} onChange={e=>setConfig({...config,username:e.target.value})}/></Field>
    <Field label="SMTP Password" hint={server?.passwordConfigured?'Пароль уже збережено в Supabase. Порожнє поле залишає його; зміна хоста чи логіна потребує нового пароля.':'Пароль зберігатиметься у поштових налаштуваннях Supabase та не повертатиметься в інтерфейс.'}><input type="password" autoComplete="new-password" required={!server?.passwordConfigured} value={password} disabled={busy} onChange={e=>setPassword(e.target.value)}/></Field>
    <Field label="Email відправника"><input type="email" required value={config.senderEmail} placeholder="no-reply@example.com" disabled={busy} onChange={e=>setConfig({...config,senderEmail:e.target.value})}/></Field>
    <Field label="Ім’я відправника"><input required value={config.senderName} disabled={busy} onChange={e=>setConfig({...config,senderName:e.target.value})}/></Field>
    {error&&<div role="alert" className="notice error">{error}</div>}
    <button className="button primary" disabled={busy||!access}><Save size={17}/>{busy?'Обробляємо…':'Застосувати SMTP'}</button>
  </form>;
}

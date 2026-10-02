import { useEffect,useRef,useState } from 'react';
import { KeyRound,LoaderCircle,RefreshCw,Save,Trash2,Users,Sparkles } from 'lucide-react';
import { Field,Modal,formatDate } from './ui';
import { serviceCall,EFFORTS,type Account,type PublicLlmConfig } from './service';

export function AdminPanel({onClose,notify,onConfigChange,request=serviceCall}:{onClose:()=>void;notify:(s:string)=>void;onConfigChange:()=>void;request?:typeof serviceCall}){
  const [tab,setTab]=useState<'users'|'llm'>('users');
  const [users,setUsers]=useState<Account[]>([]),[page,setPage]=useState(1),[hasMore,setHasMore]=useState(false);
  const [config,setConfig]=useState<PublicLlmConfig|null>(null),[apiKey,setApiKey]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [target,setTarget]=useState<Account|null>(null),[confirmation,setConfirmation]=useState('');
  const active=useRef(true);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  async function load(nextPage=page){
    setBusy(true);setError('');
    try{
      if(tab==='users'){
        const result=await request<{users:Account[];hasMore:boolean}>('list_users',{page:nextPage});
        if(active.current){setUsers(result.users);setPage(nextPage);setHasMore(result.hasMore);}
      }else{
        const result=await request<PublicLlmConfig>('get_config');
        if(active.current){setConfig(result);setApiKey('');}
      }
    }catch(e){if(active.current)setError((e as Error).message);}finally{if(active.current)setBusy(false);}
  }
  useEffect(()=>{void load(1);},[tab]);
  async function accountAction(action:'reset_password'|'delete_user',account:Account){
    setBusy(true);setError('');
    try{
      await request(action,{userId:account.id,...(action==='delete_user'?{confirmEmail:confirmation}:{})});
      if(!active.current)return;
      notify(action==='reset_password'?'Запит на лист відновлення прийнято поштовим сервісом.':'Акаунт і його хмарні дані видалено.');
      setTarget(null);setConfirmation('');
      await load();
    }catch(e){if(active.current)setError((e as Error).message);}finally{if(active.current)setBusy(false);}
  }
  return <Modal title="Адміністрування" subtitle="Користувачі та зовнішній LLM" onClose={onClose} wide>
    <div className="modal-tabs" role="tablist" aria-label="Адміністрування">
      <button role="tab" aria-selected={tab==='users'} className={tab==='users'?'active':''} disabled={busy} onClick={()=>setTab('users')}><Users size={17}/>Користувачі</button>
      <button role="tab" aria-selected={tab==='llm'} className={tab==='llm'?'active':''} disabled={busy} onClick={()=>setTab('llm')}><Sparkles size={17}/>Зовнішній LLM</button>
    </div>
    <div className="modal-body">
      {error&&<div className="notice error" role="alert">{error}</div>}
      {busy&&<p role="status"><LoaderCircle size={17} className="spin"/> Обробляємо…</p>}
      {tab==='users'&&<>
        <div className="section-title-row"><h3>Зареєстровані акаунти</h3><button className="button secondary small" disabled={busy} onClick={()=>void load()}><RefreshCw size={15}/>Оновити</button></div>
        <div className="admin-users">{users.map(account=><article className="admin-user" key={account.id}>
          <div><strong>{account.email}</strong><span className="tag">{account.isAdmin?'Адміністратор':'Користувач'}</span>
            <p className="form-note">Реєстрація: {formatDate(account.createdAt)} · {account.confirmed?'Email підтверджено':'Email не підтверджено'}<br/>Останній вхід: {account.lastSignInAt?formatDate(account.lastSignInAt):'—'}</p></div>
          <div className="button-row"><button className="button secondary small" disabled={busy} onClick={()=>void accountAction('reset_password',account)}><KeyRound size={15}/>Лист відновлення</button>
            <button className="button danger small" disabled={busy||account.isAdmin} onClick={()=>{setTarget(account);setConfirmation('');}}><Trash2 size={15}/>Видалити</button></div>
        </article>)}</div>
        {!busy&&!users.length&&<p>У цьому переліку немає користувачів.</p>}
        <div className="button-row"><button className="button secondary small" disabled={busy||page<=1} onClick={()=>void load(page-1)}>Попередні</button><span>Сторінка {page}</span><button className="button secondary small" disabled={busy||!hasMore} onClick={()=>void load(page+1)}>Наступні</button></div>
        {target&&<section className="delete-confirmation" role="region" aria-label="Підтвердження видалення">
          <h3>Видалити {target.email}?</h3><p>Акаунт, його хмарний простір та AI-історію буде видалено без відновлення. Локальні копії на пристроях можуть залишитися.</p>
          <Field label="Введіть email для підтвердження"><input autoComplete="off" value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></Field>
          <div className="button-row"><button className="button secondary" disabled={busy} onClick={()=>setTarget(null)}>Скасувати</button><button className="button danger" disabled={busy||confirmation!==target.email} onClick={()=>void accountAction('delete_user',target)}>Видалити акаунт назавжди</button></div>
        </section>}
      </>}
      {tab==='llm'&&config&&<form onSubmit={async e=>{
        e.preventDefault();setBusy(true);setError('');
        try{
          const result=await request<PublicLlmConfig>('save_config',{config,apiKey,revision:config.revision});
          if(active.current){setConfig(result);setApiKey('');notify('Налаштування LLM збережено.');onConfigChange();}
        }catch(e){if(active.current)setError((e as Error).message);}finally{if(active.current)setBusy(false);}
      }}>
        <Field label="API Base URL" hint="Базова HTTPS-адреса, наприклад https://api.openai.com/v1"><input type="url" required value={config.baseUrl} onChange={e=>setConfig({...config,baseUrl:e.target.value})}/></Field>
        <Field label="API Key" hint={config.keyConfigured?'Ключ збережено на сервері. Залиште порожнім, щоб зберегти його.':'Ключ зберігається на сервері та не повертається у браузер.'}><input type="password" autoComplete="new-password" required={!config.keyConfigured} value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder={config.keyConfigured?'Збережений ключ не відображається':'Введіть API Key'}/></Field>
        <Field label="Model"><input required value={config.model} onChange={e=>setConfig({...config,model:e.target.value})} placeholder="Ідентифікатор моделі вашого провайдера"/></Field>
        <div className="form-grid"><Field label="API Format"><select value={config.apiFormat} onChange={e=>setConfig({...config,apiFormat:e.target.value as PublicLlmConfig['apiFormat']})}><option value="responses">Responses API (OpenAI)</option><option value="chat_completions">Chat Completions</option></select></Field>
          <Field label="Reasoning Effort" hint="Доступні рівні залежать від моделі. Default не надсилає цей параметр."><select value={config.reasoningEffort} onChange={e=>setConfig({...config,reasoningEffort:e.target.value as PublicLlmConfig['reasoningEffort']})}>{EFFORTS.map(value=><option key={value} value={value}>{value==='default'?'Default (за замовчуванням моделі)':value}</option>)}</select></Field></div>
        <Field label="Monthly Token Budget" hint="На кожного користувача за календарний місяць UTC. Вхідні + вихідні токени, включно з reasoning. 0 = unlimited."><input type="number" min="0" max="1000000000000" step="1" required value={config.monthlyTokenBudget} onChange={e=>setConfig({...config,monthlyTokenBudget:Number(e.target.value)})}/></Field>
        <p className="form-note">Перед викликом резервується консервативна оцінка входу та максимальна відповідь. Після завершення враховується usage провайдера; при невідомому результаті — резерв. Провайдер має підтримувати JSON Schema для обраної моделі й формату.</p>
        <button className="button primary" disabled={busy}><Save size={17}/>Зберегти LLM</button>
      </form>}
    </div>
  </Modal>;
}

import { useEffect,useRef,useState } from 'react';
import { KeyRound,LoaderCircle,RefreshCw,Save,Trash2,Users,Sparkles,Mail,Ticket } from 'lucide-react';
import {SmtpPanel} from './SmtpPanel';
import {RegistrationPanel} from './RegistrationPanel';
import { Field,Modal,formatDate } from './ui';
import { useI18n } from './i18n';
import { serviceCall,EFFORTS,RULES_VERSION,type Account,type PublicLlmConfig,type ServiceStatus } from './service';

/** The site is published automatically after a merge, jobsearch-api only manually: warn when their LLM rules differ. */
function RulesNotice({request}:{request:typeof serviceCall}){
  const {t}=useI18n();
  // undefined while checking; null when the function predates reporting its version.
  const [deployed,setDeployed]=useState<string|null>(),[failure,setFailure]=useState<string|null>(null);
  useEffect(()=>{
    let live=true;
    request<ServiceStatus>('status').then(status=>{if(live)setDeployed(status.rulesVersion||null);},
      e=>{if(live)setFailure((e as Error).message);});
    return()=>{live=false;};
  },[request]);
  // An unchecked version is reported as such, not as a mismatch, and does not hide the settings form.
  if(failure!==null)return <div className="notice" role="status">{t('admin.llm.rules.failed',{error:failure})}</div>;
  if(deployed===undefined||deployed===RULES_VERSION)return null;
  return <div className="notice" role="alert">
    <strong>{t(deployed?'admin.llm.rules.mismatch':'admin.llm.rules.missing')}</strong>
    <dl className="rules-versions">
      <dt>{t('admin.llm.rules.deployed')}</dt><dd>{deployed||'—'}</dd>
      <dt>{t('admin.llm.rules.interface')}</dt><dd>{RULES_VERSION}</dd>
    </dl>
    <p>{t('admin.llm.rules.action')}</p>
  </div>;
}

export function AdminPanel({onClose,notify,onConfigChange,request=serviceCall}:{onClose:()=>void;notify:(s:string)=>void;onConfigChange:()=>void;request?:typeof serviceCall}){
  const {t}=useI18n();
  const [tab,setTab]=useState<'users'|'llm'|'smtp'|'registration'>('users');
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
      }else if(tab==='llm'){
        const result=await request<PublicLlmConfig>('get_config');
        if(active.current){setConfig(result);setApiKey('');}
      }
    }catch(e){if(active.current)setError((e as Error).message);}finally{if(active.current)setBusy(false);}
  }
  // Reload only when the tab changes; load() reads the current page and tab itself.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{void load(1);},[tab]);
  async function accountAction(action:'reset_password'|'delete_user',account:Account){
    setBusy(true);setError('');
    try{
      await request(action,{userId:account.id,...(action==='delete_user'?{confirmEmail:confirmation}:{})});
      if(!active.current)return;
      notify(t(action==='reset_password'?'toast.recoveryAccepted':'toast.accountDeleted'));
      setTarget(null);setConfirmation('');
      await load();
    }catch(e){if(active.current)setError((e as Error).message);}finally{if(active.current)setBusy(false);}
  }
  return <Modal title={t('admin.title')} subtitle={t('admin.subtitle')} onClose={onClose} wide>
    <div className="modal-tabs admin-tabs" role="tablist" aria-label={t('admin.title')}>
      <button role="tab" aria-selected={tab==='users'} className={tab==='users'?'active':''} disabled={busy} onClick={()=>setTab('users')}><Users size={17}/>{t('admin.tab.users')}</button>
      <button role="tab" aria-selected={tab==='llm'} className={tab==='llm'?'active':''} disabled={busy} onClick={()=>setTab('llm')}><Sparkles size={17}/>{t('admin.tab.llm')}</button>
      <button role="tab" aria-selected={tab==='smtp'} className={tab==='smtp'?'active':''} disabled={busy} onClick={()=>setTab('smtp')}><Mail size={17}/>{t('admin.tab.smtp')}</button>
      <button role="tab" aria-selected={tab==='registration'} className={tab==='registration'?'active':''} disabled={busy} onClick={()=>setTab('registration')}><Ticket size={17}/>{t('registration.title')}</button>
    </div>
    <div className="modal-body">
      {error&&<div className="notice error" role="alert">{error}</div>}
      {busy&&<p role="status"><LoaderCircle size={17} className="spin"/> {t('common.processing')}</p>}
      {tab==='smtp'&&<SmtpPanel request={request} notify={notify}/>}
      {tab==='registration'&&<RegistrationPanel request={request} notify={notify}/>}
      {tab==='users'&&<>
        <div className="section-title-row"><h3>{t('admin.users.title')}</h3><button className="button secondary small" disabled={busy} onClick={()=>void load()}><RefreshCw size={15}/>{t('common.refresh')}</button></div>
        <div className="admin-users">{users.map(account=><article className="admin-user" key={account.id}>
          <div><strong>{account.email}</strong><span className="tag">{t(account.isAdmin?'admin.role.admin':'admin.role.user')}</span>
            <p className="form-note">{t('admin.registered',{date:formatDate(account.createdAt)})} · {t(account.confirmed?'admin.confirmed':'admin.unconfirmed')}<br/>{t('admin.lastSignIn',{date:account.lastSignInAt?formatDate(account.lastSignInAt):'—'})}</p>
            {account.promoCode&&<p className="form-note">{t('registration.accountCode',{code:account.promoCode})}</p>}</div>
          <div className="button-row"><button className="button secondary small" disabled={busy} onClick={()=>void accountAction('reset_password',account)}><KeyRound size={15}/>{t('admin.recoveryEmail')}</button>
            <button className="button danger small" disabled={busy||account.isAdmin} onClick={()=>{setTarget(account);setConfirmation('');}}><Trash2 size={15}/>{t('common.delete')}</button></div>
        </article>)}</div>
        {!busy&&!users.length&&<p>{t('admin.users.empty')}</p>}
        <div className="button-row"><button className="button secondary small" disabled={busy||page<=1} onClick={()=>void load(page-1)}>{t('admin.prev')}</button><span>{t('admin.page',{page})}</span><button className="button secondary small" disabled={busy||!hasMore} onClick={()=>void load(page+1)}>{t('admin.next')}</button></div>
        {target&&<section className="delete-confirmation" aria-label={t('admin.delete.aria')}>
          <h3>{t('admin.delete.title',{email:target.email})}</h3><p>{t('admin.delete.text')}</p>
          <Field label={t('admin.delete.confirmLabel')}><input autoComplete="off" value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></Field>
          <div className="button-row"><button className="button secondary" disabled={busy} onClick={()=>setTarget(null)}>{t('common.cancel')}</button><button className="button danger" disabled={busy||confirmation!==target.email} onClick={()=>void accountAction('delete_user',target)}>{t('admin.delete.button')}</button></div>
        </section>}
      </>}
      {tab==='llm'&&<RulesNotice request={request}/>}
      {tab==='llm'&&config&&<form onSubmit={async event=>{
        event.preventDefault();setBusy(true);setError('');
        try{
          const result=await request<PublicLlmConfig>('save_config',{config,apiKey,revision:config.revision});
          if(active.current){setConfig(result);setApiKey('');notify(t('toast.llmSaved'));onConfigChange();}
        }catch(e){if(active.current)setError((e as Error).message);}finally{if(active.current)setBusy(false);}
      }}>
        <Field label="API Base URL" hint={t('admin.llm.baseUrl.hint')}><input type="url" required value={config.baseUrl} onChange={e=>setConfig({...config,baseUrl:e.target.value})}/></Field>
        <Field label="API Key" hint={t(config.keyConfigured?'admin.llm.key.hintSaved':'admin.llm.key.hintNew')}><input type="password" autoComplete="new-password" required={!config.keyConfigured} value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder={t(config.keyConfigured?'admin.llm.key.placeholderSaved':'admin.llm.key.placeholderNew')}/></Field>
        <Field label="Model"><input required value={config.model} onChange={e=>setConfig({...config,model:e.target.value})} placeholder={t('admin.llm.model.placeholder')}/></Field>
        <div className="form-grid"><Field label="API Format"><select value={config.apiFormat} onChange={e=>setConfig({...config,apiFormat:e.target.value as PublicLlmConfig['apiFormat']})}><option value="responses">Responses API (OpenAI)</option><option value="chat_completions">Chat Completions</option></select></Field>
          <Field label="Reasoning Effort" hint={t('admin.llm.effort.hint')}><select value={config.reasoningEffort} onChange={e=>setConfig({...config,reasoningEffort:e.target.value as PublicLlmConfig['reasoningEffort']})}>{EFFORTS.map(value=><option key={value} value={value}>{value==='default'?t('admin.llm.effort.default'):value}</option>)}</select></Field></div>
        <Field label="Monthly Token Budget" hint={t('admin.llm.budget.hint')}><input type="number" min="0" max="1000000000000" step="1" required value={config.monthlyTokenBudget} onChange={e=>setConfig({...config,monthlyTokenBudget:Number(e.target.value)})}/></Field>
        <p className="form-note">{t('admin.llm.note')}</p>
        <button className="button primary" disabled={busy}><Save size={17}/>{t('admin.llm.save')}</button>
      </form>}
    </div>
  </Modal>;
}

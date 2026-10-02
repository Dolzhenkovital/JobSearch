import {useEffect,useState} from 'react';
import {cloud,recoveryRedirect} from './cloud';
import {useI18n} from './i18n';
import {Field,Modal} from './ui';
export function PasswordRecovery(){
  const {t}=useI18n();
  const [open,setOpen]=useState(recoveryRedirect);
  const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>{if(!cloud)return;const {data}=cloud.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY')setOpen(true);if(event==='SIGNED_OUT'){setOpen(false);setPassword('');setConfirm('');}});return()=>data.subscription.unsubscribe();},[]);
  if(!open)return null;
  return <Modal title={t('recovery.title')} subtitle={t('recovery.subtitle')} onClose={()=>{setOpen(false);setPassword('');setConfirm('');}}>
    <form className="modal-body" onSubmit={async event=>{event.preventDefault();if(!cloud||password!==confirm)return;setBusy(true);setMessage('');
      try{const {error}=await cloud.auth.updateUser({password});if(error)throw error;setPassword('');setConfirm('');setMessage(t('recovery.updated'));}
      catch{setMessage(t('recovery.failed'));}finally{setBusy(false);}}}>
      <Field label={t('recovery.title')}><input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)}/></Field>
      <Field label={t('recovery.repeat')}><input type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={e=>setConfirm(e.target.value)}/></Field>
      {confirm&&password!==confirm&&<p role="alert">{t('recovery.mismatch')}</p>}
      {message&&<p role="status">{message}</p>}
      <button className="button primary" disabled={busy||password!==confirm||password.length<12}>{t('recovery.save')}</button>
    </form>
  </Modal>;
}

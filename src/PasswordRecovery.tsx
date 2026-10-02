import {useEffect,useState} from 'react';
import {cloud,recoveryRedirect} from './cloud';
import {Field,Modal} from './ui';
export function PasswordRecovery(){
  const [open,setOpen]=useState(recoveryRedirect);
  const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>{if(!cloud)return;const {data}=cloud.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY')setOpen(true);if(event==='SIGNED_OUT'){setOpen(false);setPassword('');setConfirm('');}});return()=>data.subscription.unsubscribe();},[]);
  if(!open)return null;
  return <Modal title="Новий пароль" subtitle="Відновлення доступу до JobSearch" onClose={()=>{setOpen(false);setPassword('');setConfirm('');}}>
    <form className="modal-body" onSubmit={async e=>{e.preventDefault();if(!cloud||password!==confirm)return;setBusy(true);setMessage('');
      try{const {error}=await cloud.auth.updateUser({password});if(error)throw error;setPassword('');setConfirm('');setMessage('Пароль оновлено. Можна продовжувати роботу.');}
      catch{setMessage('Не вдалося оновити пароль. Перевірте вимоги до пароля або отримайте новий лист відновлення.');}finally{setBusy(false);}}}>
      <Field label="Новий пароль"><input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)}/></Field>
      <Field label="Повторіть пароль"><input type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={e=>setConfirm(e.target.value)}/></Field>
      {confirm&&password!==confirm&&<p role="alert">Паролі не збігаються.</p>}
      {message&&<p role="status">{message}</p>}
      <button className="button primary" disabled={busy||password!==confirm||password.length<12}>Зберегти новий пароль</button>
    </form>
  </Modal>;
}

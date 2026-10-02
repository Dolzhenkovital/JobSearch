// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
const {updateUser,subscribe}=vi.hoisted(()=>({updateUser:vi.fn(async()=>({error:null})),subscribe:vi.fn(()=>({data:{subscription:{unsubscribe:vi.fn()}}}))}));
vi.mock('./cloud',()=>({recoveryRedirect:true,cloud:{auth:{updateUser,onAuthStateChange:subscribe}}}));
import {PasswordRecovery} from './PasswordRecovery';
it('opens after Auth has already consumed the URL hash and submits only matching passwords',async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  HTMLDialogElement.prototype.showModal=vi.fn();HTMLDialogElement.prototype.close=vi.fn();
  location.hash='';
  const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
  try{
    await act(async()=>root.render(<PasswordRecovery/>));
    expect(container.querySelector('h2')?.textContent).toBe('Новий пароль');
    const fields=container.querySelectorAll('input');
    const edit=async(i:number,value:string)=>act(async()=>{
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(fields[i],value);
      fields[i].dispatchEvent(new Event('input',{bubbles:true}));
    });
    await edit(0,'synthetic-password-123');await edit(1,'different-password-123');
    expect(container.querySelector('button.primary')?.hasAttribute('disabled')).toBe(true);
    await act(async()=>container.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
    expect(updateUser).not.toHaveBeenCalled();
    await edit(1,'synthetic-password-123');
    await act(async()=>container.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
    expect(updateUser).toHaveBeenCalledWith({password:'synthetic-password-123'});
    expect(fields[0].value).toBe('');expect(fields[1].value).toBe('');
  }finally{await act(async()=>root.unmount());container.remove();}
});

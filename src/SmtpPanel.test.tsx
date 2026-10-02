// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {SmtpPanel} from './SmtpPanel';
import type {serviceCall} from './service';
vi.mock('./cloud',()=>({cloud:null}));
it('keeps secrets out of loaded fields and clears transient credentials after apply',async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  const config={host:'smtp.example.com',port:587,username:'synthetic',senderEmail:'sender@example.com',senderName:'JobSearch'};
  const request=vi.fn(async()=>({config,managementConfigured:false,passwordConfigured:true}));
  const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
  try{
    await act(async()=>root.render(<SmtpPanel request={request as typeof serviceCall} notify={()=>{}}/>));
    const fields=container.querySelectorAll<HTMLInputElement>('input[type=password]');
    expect(fields).toHaveLength(2);expect(fields[0].value).toBe('');expect(fields[1].value).toBe('');
    expect((container.querySelector('button.primary') as HTMLButtonElement).disabled).toBe(true);
    await act(async()=>{
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(fields[0],'synthetic-management-token');
      fields[0].dispatchEvent(new Event('input',{bubbles:true}));
    });
    await act(async()=>container.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
    expect(request).toHaveBeenCalledWith('save_smtp',{config,password:'',managementToken:'synthetic-management-token'});
    expect(fields[0].value).toBe('');expect(fields[1].value).toBe('');
  }finally{await act(async()=>root.unmount());container.remove();}
});

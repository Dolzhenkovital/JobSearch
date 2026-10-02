// @vitest-environment jsdom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {AdminPanel} from './AdminPanel';
import type {serviceCall} from './service';
vi.mock('./cloud',()=>({cloud:null}));
let root:Root,container:HTMLDivElement;
const config={baseUrl:'https://api.example.com/v1',model:'synthetic',apiFormat:'responses',reasoningEffort:'default',monthlyTokenBudget:50000,revision:1,keyConfigured:true};
const request=vi.fn(async(action:string)=>action==='list_users'?{users:[
  {id:'owner',email:'admin@example.invalid',createdAt:'2026-10-01',confirmed:true,isAdmin:true},
  {id:'member',email:'member@example.invalid',createdAt:'2026-10-01',confirmed:true,isAdmin:false}],hasMore:false}:config);
const button=(label:string)=>[...container.querySelectorAll('button')].find(b=>b.textContent===label)!;
async function click(label:string){await act(async()=>button(label).click());}
async function edit(input:HTMLInputElement,value:string){await act(async()=>{
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);
  input.dispatchEvent(new Event('input',{bubbles:true}));
});}
beforeEach(async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  HTMLDialogElement.prototype.showModal=vi.fn();HTMLDialogElement.prototype.close=vi.fn();
  container=document.createElement('div');document.body.append(container);root=createRoot(container);request.mockClear();
  await act(async()=>root.render(<AdminPanel onClose={()=>{}} notify={()=>{}} onConfigChange={()=>{}} request={request as typeof serviceCall}/>));
});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();});
it('requires exact email confirmation for deletion and protects administrators',async()=>{
  const rows=container.querySelectorAll('.admin-user');
  expect((rows[0].querySelector('.danger') as HTMLButtonElement).disabled).toBe(true);
  await act(async()=>(rows[1].querySelector('.danger') as HTMLButtonElement).click());
  expect(button('Видалити акаунт назавжди').disabled).toBe(true);
  const input=container.querySelector('.delete-confirmation input') as HTMLInputElement;
  await edit(input,'wrong@example.invalid');expect(button('Видалити акаунт назавжди').disabled).toBe(true);
  await edit(input,'member@example.invalid');await click('Видалити акаунт назавжди');
  expect(request).toHaveBeenCalledWith('delete_user',{userId:'member',confirmEmail:'member@example.invalid'});
});
it('retains a saved key when blank and clears a replacement after saving',async()=>{
  await click('Зовнішній LLM');
  let key=container.querySelector('input[type=password]') as HTMLInputElement;
  expect(key.value).toBe('');expect(key.required).toBe(false);
  await click('Зберегти LLM');
  expect(request).toHaveBeenCalledWith('save_config',expect.objectContaining({apiKey:'',revision:1}));
  key=container.querySelector('input[type=password]') as HTMLInputElement;
  await edit(key,'synthetic-key-for-test');await click('Зберегти LLM');
  expect(request).toHaveBeenCalledWith('save_config',expect.objectContaining({apiKey:'synthetic-key-for-test'}));
  expect(key.value).toBe('');
});

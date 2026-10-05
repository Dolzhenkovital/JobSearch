// @vitest-environment jsdom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {AiPanel} from './AiPanel';
import {setLanguage} from './i18n';
import {initialStore} from './domain';
import {makeLlmInput,type LlmRun,type ServiceStatus,type serviceCall} from './service';
import type {Job} from './types';
vi.mock('./cloud',()=>({cloud:null}));
let root:Root,container:HTMLDivElement;
const job:Job={id:'synthetic:ai',title:'Reporting assistant',employer:'Example Employer',location:'',salary:'',url:'',source:'Job Bank',
  description:'Synthetic full description.',completeness:'full',publishedAt:null,firstSeenAt:'2026-10-01T00:00:00.000Z',checkedAt:'2026-10-01T00:00:00.000Z',availability:'unknown'};
const {settings}=initialStore();
const profile={...initialStore().profile,cv:'Prepared Excel reports for a team of 5.',version:2};
const service:ServiceStatus={isAdmin:false,configured:true,monthlyTokenBudget:0,usage:{used_tokens:0,reserved_tokens:0,month:'2026-10'}};
const run=(result:Record<string,unknown>):LlmRun=>({id:'run',user_id:'user',operation:'tailor',status:'succeeded',input:makeLlmInput(job,profile,settings),
  result:{cv:'Increased sales 40%.',letter:'I apply.',changeSummary:[],claims:[],questions:['Which reports matter most?'],...result} as LlmRun['result'],
  model:'synthetic',rules_version:'rules',created_at:'2026-10-02T00:00:00Z',input_hash:'hash',error_code:null,charged_tokens:1,usage_estimated:false});
async function show(saved:LlmRun){
  const request=vi.fn(async()=>({runs:[saved]}));
  await act(async()=>root.render(<AiPanel job={job} profile={profile} settings={settings} userId="user" service={service}
    onPacket={()=>{}} onUsageChange={()=>{}} request={request as unknown as typeof serviceCall}/>));
  return [...container.querySelectorAll('.ai-result .notice li')].map(li=>li.textContent);
}
beforeEach(()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  container=document.createElement('div');document.body.append(container);root=createRoot(container);
});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();setLanguage('uk');});
it('writes the server number checks in the interface language before the model questions',async()=>{
  const saved=run({unsupportedNumbers:{lines:[{document:'cv',line:'Increased sales 40% for 1 200 clients.',numbers:['40%','1 200']},
    {document:'letter',line:'I served 12 clients.',numbers:['12']}],omitted:3}});
  expect(await show(saved)).toEqual(['CV: у профілі не знайдено 40%, 1\u00a0200. Рядок: «Increased sales 40% for 1 200 clients.»',
    'Лист: у профілі не знайдено 12. Рядок: «I served 12 clients.»','Ще рядків із числами, яких немає в профілі: 3.','Which reports matter most?']);
  setLanguage('en');
  expect(await show(saved)).toEqual(['CV: 40%, 1\u00a0200 not found in your profile. Line: “Increased sales 40% for 1 200 clients.”',
    'Letter: 12 not found in your profile. Line: “I served 12 clients.”','More lines with numbers not found in your profile: 3.','Which reports matter most?']);
});
it('shows drafts saved before number checks existed',async()=>{
  expect(await show(run({}))).toEqual(['Which reports matter most?']);
});

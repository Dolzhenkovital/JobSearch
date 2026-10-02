import {describe,it,expect} from 'vitest';
import {parseConfig,parseInput,providerRequest,providerOutput,validateMatch,validateTailor,AppError,type LlmInput,type LlmConfig} from '../supabase/functions/_shared/llm';
import {publicAddress} from '../supabase/functions/_shared/handler';
import {initialStore,parseBackup} from './domain';

export const input:LlmInput={profileVersion:2,evidence:[{id:'cv:1',text:'Prepared Excel reports for a team of 5 in 2022.'}],
  job:{id:'synthetic:1',title:'Reporting assistant',employer:'Example Employer',description:'Excel reports required. Certificate required. French required.',completeness:'full',availability:'unknown',location:'',salary:''},
  preferences:{city:'',roles:'',minHourly:'',applyPreferences:false},documentLanguage:'en'};
const config:LlmConfig={baseUrl:'https://api.example.com/v1',model:'synthetic-model',apiFormat:'responses',reasoningEffort:'default',monthlyTokenBudget:0};
const requirement={requirement:'Excel',jobQuote:'Excel reports required.',category:'skills',importance:'required',status:'supported',evidenceIds:['cv:1'],explanation:'Reports in the source CV.'};
describe('LLM contracts and output boundaries',()=>{
  it('accepts German documents and an interface language, defaulting older clients to Ukrainian',()=>{
    expect(parseInput(input,'match').interfaceLanguage).toBe('uk');
    const german=parseInput({...input,documentLanguage:'de',interfaceLanguage:'de'},'tailor');
    expect(german.documentLanguage).toBe('de');
    expect(german.interfaceLanguage).toBe('de');
    expect(()=>parseInput({...input,documentLanguage:'es'},'match')).toThrow(AppError);
    expect(()=>parseInput({...input,interfaceLanguage:'es'},'match')).toThrow(AppError);
  });
  it('builds both API formats with model-dependent effort omitted by default',()=>{
    const responses=providerRequest(config,'match',input);
    expect(responses.url).toBe('https://api.example.com/v1/responses');
    expect(responses.body).not.toHaveProperty('reasoning');
    expect(responses.body).toHaveProperty('text.format.type','json_schema');
    const chat=providerRequest({...config,apiFormat:'chat_completions',reasoningEffort:'high'},'tailor',input);
    expect(chat.url).toBe('https://api.example.com/v1/chat/completions');
    expect(chat.body).toHaveProperty('reasoning_effort','high');
    expect(chat.body).toHaveProperty('response_format.json_schema.strict',true);
    expect(chat.body).toHaveProperty('max_completion_tokens',12000);
  });
  it('rejects unsafe endpoints, invalid budgets and partial final inputs',()=>{
    for(const baseUrl of ['http://api.example.com','https://localhost','https://127.0.0.1','https://[::1]','https://user:secret@example.com','https://api.example.com/v1?key=secret','https://api.example.com/v1/responses'])
      expect(()=>parseConfig({...config,baseUrl})).toThrow();
    expect(()=>parseConfig({...config,monthlyTokenBudget:-1})).toThrow();
    expect(()=>parseConfig({...config,monthlyTokenBudget:1.5})).toThrow();
    expect(()=>parseInput({...input,job:{...input.job,completeness:'snippet'}},'tailor')).toThrow('full_open_job_required');
    expect(()=>parseInput({...input,job:{...input.job,availability:'closed'}},'tailor')).toThrow();
    expect(parseConfig(config).monthlyTokenBudget).toBe(0);
    expect(publicAddress('127.0.0.1')).toBe(false);expect(publicAddress('169.254.169.254')).toBe(false);
    expect(publicAddress('::ffff:127.0.0.1')).toBe(false);expect(publicAddress('fc00::1')).toBe(false);
    expect(publicAddress('8.8.8.8')).toBe(true);
  });
  it('keeps unknown evidence distinct and excludes languages from scoring and coverage',()=>{
    const raw={summary:'Relevant reporting experience.',requirements:[requirement,{...requirement,requirement:'Certificate',jobQuote:'Certificate required.',category:'education',status:'unknown',evidenceIds:[]}],questions:['Do you have the certificate?'],preferenceConflicts:[]};
    const before=validateMatch(raw,input);
    const after=validateMatch({...raw,requirements:[...raw.requirements,{...requirement,requirement:'French',jobQuote:'French required.',category:'language',status:'unknown',evidenceIds:[]}]},input);
    expect(before.score).toBe(100);expect(before.coverage).toBe(50);expect(before.decision).toBe('needs_information');
    expect(after.score).toBe(before.score);expect(after.coverage).toBe(before.coverage);expect(after.decision).toBe(before.decision);
  });
  it('rejects invented source quotes, missing fact IDs and unsupported numeric claims',()=>{
    const raw={summary:'Summary',requirements:[{...requirement,evidenceIds:['cv:missing']}],questions:[],preferenceConflicts:[]};
    expect(()=>validateMatch(raw,input)).toThrow('unsupported_evidence');
    expect(()=>validateMatch({...raw,requirements:[{...requirement,jobQuote:'Invented requirement'}]},input)).toThrow('unsupported_job_quote');
    expect(()=>validateTailor({cv:'Led a team of 50',letter:'I am applying.',claims:[{text:'Led a team of 50',evidenceIds:['cv:1']}],questions:[],changeSummary:[]},input)).toThrow('unsupported_evidence');
  });
  it('reads HTTP JSON outputs and usage without double-counting reasoning tokens',()=>{
    const data=providerOutput({status:'completed',output:[{type:'reasoning',summary:[]},{type:'message',content:[{type:'output_text',text:'{"ok":true}'}]}],usage:{input_tokens:100,output_tokens:200,output_tokens_details:{reasoning_tokens:150}}},'responses');
    expect(data).toEqual({value:{ok:true},inputTokens:100,outputTokens:200});
    expect(providerOutput({choices:[{finish_reason:'stop',message:{content:'{"ok":true}'}}],usage:{prompt_tokens:20,completion_tokens:30}},'chat_completions').outputTokens).toBe(30);
    expect(()=>providerOutput({status:'incomplete'},'responses')).toThrow(AppError);
  });
  it('roundtrips generated packet provenance while accepting old backups',()=>{
    const store=initialStore();expect(parseBackup(JSON.stringify(store))).toEqual(store);
    store.packets.push({id:'packet',jobId:'synthetic:1',title:'Role',employer:'Example',cv:'Original facts',letter:'Letter',profileVersion:1,descriptionVersion:'hash',createdAt:new Date().toISOString(),approvedAt:null,llmRunId:'run-id',llmRulesVersion:'rules-v1'});
    expect(parseBackup(JSON.stringify(store)).packets[0].llmRunId).toBe('run-id');
  });
});

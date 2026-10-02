import { useEffect,useRef,useState } from 'react';
import { Sparkles,LoaderCircle,RefreshCw,FileText } from 'lucide-react';
import { serviceCall,serviceMessage,makeLlmInput,type LlmRun,type MatchResult,type TailorResult,type ServiceStatus } from './service';
import type { Job,Profile,Settings } from './types';
import { formatTime } from './ui';
import {stableJson} from '../supabase/functions/_shared/llm';

const statusLabels={supported:'Підтверджено джерелом',transferable:'Переносний досвід',unknown:'Невідомо',contradicted:'Підтверджена розбіжність',excluded:'Поза оцінкою'};
const decisionLabels={prioritize:'Варто пріоритезувати',consider:'Варто розглянути',needs_information:'Потрібні уточнення',deprioritize:'Є суттєві розбіжності'};
export function AiPanel({job,profile,settings,userId,service,onPacket,onUsageChange,request=serviceCall}:{job:Job;profile:Profile;settings:Settings;
  userId:string|null;service:ServiceStatus|null;onPacket:(run:LlmRun)=>void;onUsageChange:()=>void;request?:typeof serviceCall}){
  const [runs,setRuns]=useState<LlmRun[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const active=useRef(true);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  const input=makeLlmInput(job,profile,settings);
  async function reload(){
    if(!userId)return;
    try{const result=await request<{runs:LlmRun[]}>('runs',{jobId:job.id});if(active.current){setRuns(result.runs.filter(r=>r.input.job.id===job.id));setError('');}}
    catch(e){if(active.current)setError((e as Error).message);}
  }
  useEffect(()=>{if(service?.configured)void reload();},[userId,job.id,service?.configured]);
  async function run(operation:'match'|'tailor'){
    setBusy(true);setError('');
    try{
      const response=await request<{run:LlmRun}>(operation,{requestId:crypto.randomUUID(),input});
      if(!active.current)return;
      setRuns(current=>[response.run,...current.filter(r=>r.id!==response.run.id)]);
      if(response.run.status!=='succeeded')setError(serviceMessage(response.run.error_code||'request_in_progress'));
      onUsageChange();
    }catch(e){if(active.current)setError((e as Error).message);}finally{if(active.current)setBusy(false);}
  }
  const match=runs.find(r=>r.operation==='match'&&r.status==='succeeded');
  const draft=runs.find(r=>r.operation==='tailor'&&r.status==='succeeded');
  const matchData=match?.result as MatchResult|undefined;
  const draftData=draft?.result as TailorResult|undefined;
  const stale=(run:LlmRun)=>stableJson(run.input)!==stableJson(input);
  return <section className="detail-section ai-panel">
    <h3><Sparkles size={18}/>AI-оцінка та адаптація</h3>
    {!userId?<p className="muted">Увійдіть, щоб зберігати AI-результати й користуватися місячним лімітом.</p>:
      !service?.configured?<p className="muted">Адміністратор має налаштувати зовнішній LLM.</p>:<>
        <p className="form-note">Кнопка надсилає текст профілю та вакансії налаштованому LLM. Факти й готові документи потрібно перевірити.</p>
        <div className="button-row"><button className="button secondary" disabled={busy||!profile.cv.trim()} onClick={()=>void run('match')}><Sparkles size={16}/>Оцінити відповідність</button>
          <button className="button primary" disabled={busy||!profile.cv.trim()||job.completeness!=='full'||job.availability==='closed'} onClick={()=>void run('tailor')}><FileText size={16}/>Адаптувати CV та лист</button>
          <button className="icon-button" aria-label="Оновити AI-історію" disabled={busy} onClick={()=>void reload()}><RefreshCw size={17}/></button></div>
        {busy&&<p role="status"><LoaderCircle size={17} className="spin"/> LLM обробляє запит. Результат збережеться у вашій історії.</p>}
        <p className="form-note">Цього місяця: {service.usage.used_tokens.toLocaleString()} токенів · резерв {service.usage.reserved_tokens.toLocaleString()} · ліміт {service.monthlyTokenBudget?service.monthlyTokenBudget.toLocaleString():'без обмеження'}</p>
      </>}
    {error&&<div className="notice error" role="alert">{error}</div>}
    {match&&matchData&&<div className="ai-result">
      <div className="section-title-row"><h4>{decisionLabels[matchData.decision]}</h4><span className="tag">{matchData.score===null?'Недостатньо доказів':`${matchData.score}% відповідності`}</span></div>
      {(stale(match)||matchData.provisional)&&<div className="notice">{stale(match)?'Профіль, вакансія або побажання змінилися. Це оцінка попередньої версії.':'Попередня оцінка за коротким описом.'}</div>}
      <p>{matchData.summary}</p><p className="form-note">Покриття доказами: {matchData.coverage}%. Оцінка враховує відомі критерії: підтверджено = 100%, переносний досвід = 60%, суперечність = 0%; обов’язкові вимоги мають подвійну вагу. Невідомі дані та мови виключено з відсотка. Це не прогноз найму.</p>
      <div className="requirements">{matchData.requirements.filter(r=>r.category!=='language').map((r,i)=><article key={i}><strong>{r.requirement}</strong><span className="tag">{statusLabels[r.status]}</span><p>{r.explanation}</p><details><summary>Показати джерела</summary><blockquote>{r.jobQuote}</blockquote>{r.evidenceIds.map(id=><p key={id}>{match.input.evidence.find(e=>e.id===id)?.text}</p>)}</details></article>)}</div>
      {!!matchData.preferenceConflicts.length&&<ul>{matchData.preferenceConflicts.map((x,i)=><li key={i}>{x}</li>)}</ul>}
      {!!matchData.questions.length&&<div><h4>Питання для уточнення</h4><ul>{matchData.questions.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
    </div>}
    {draft&&draftData&&<div className="ai-result">
      <h4>Адаптовані документи — чернетка</h4>
      {stale(draft)&&<div className="notice">Вхідні дані змінилися. Ця чернетка використовує збережений профіль версії {draft.input.profileVersion}; перевірте її актуальність.</div>}
      <ul>{draftData.changeSummary.map((x,i)=><li key={i}>{x}</li>)}</ul>
      {!!draftData.questions.length&&<div className="notice"><strong>Потрібна перевірка</strong><ul>{draftData.questions.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
      <details><summary>Переглянути тексти й джерела</summary><h4>CV</h4><pre>{draftData.cv}</pre><h4>Супровідний лист</h4><pre>{draftData.letter}</pre>
        {draftData.claims.map((claim,i)=><div key={i}><strong>{claim.text}</strong><ul>{claim.evidenceIds.map(id=><li key={id}>{draft.input.evidence.find(e=>e.id===id)?.text}</li>)}</ul></div>)}</details>
      <button className="button primary" onClick={()=>onPacket(draft)}><FileText size={16}/>Зберегти як новий пакет</button>
    </div>}
    {!!runs.length&&<details className="ai-history"><summary>Історія запитів ({runs.length})</summary>{runs.map(r=><p key={r.id}>{formatTime(r.created_at)} · {r.operation==='match'?'Оцінка':'Документи'} · {r.status==='succeeded'?'Завершено':r.status==='pending'?'Обробляється':serviceMessage(r.error_code||'interrupted')} · {r.charged_tokens??'—'} токенів{r.usage_estimated?' (оцінка за резервом)':''}</p>)}</details>}
  </section>;
}

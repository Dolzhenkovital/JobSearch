import { useEffect,useRef,useState } from 'react';
import { Sparkles,LoaderCircle,RefreshCw,FileText } from 'lucide-react';
import { serviceCall,serviceMessage,makeLlmInput,type LlmInput,type LlmRun,type MatchResult,type TailorResult,type ServiceStatus } from './service';
import type { Job,Profile,Settings } from './types';
import { locale,useI18n } from './i18n';
import { formatTime } from './ui';
import {stableJson} from '../supabase/functions/_shared/llm';

// The interface language changes only how explanations are written, not what was assessed.
const comparable=({interfaceLanguage:_ignored,...rest}:LlmInput)=>stableJson(rest);
export function AiPanel({job,profile,settings,userId,service,onPacket,onUsageChange,request=serviceCall}:{job:Job;profile:Profile;settings:Settings;
  userId:string|null;service:ServiceStatus|null;onPacket:(run:LlmRun)=>void;onUsageChange:()=>void;request?:typeof serviceCall}){
  const {t}=useI18n();
  const [runs,setRuns]=useState<LlmRun[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const active=useRef(true);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  const input=makeLlmInput(job,profile,settings);
  async function reload(){
    if(!userId)return;
    try{const result=await request<{runs:LlmRun[]}>('runs',{jobId:job.id});if(active.current){setRuns(result.runs.filter(r=>r.input.job.id===job.id));setError('');}}
    catch(e){if(active.current)setError((e as Error).message);}
  }
  // Reload history when the account, vacancy or service availability changes.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
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
  const stale=(saved:LlmRun)=>comparable(saved.input)!==comparable(input);
  const count=(value:number)=>value.toLocaleString(locale());
  return <section className="detail-section ai-panel">
    <h3><Sparkles size={18}/>{t('ai.title')}</h3>
    {!userId?<p className="muted">{t('ai.signIn')}</p>:
      !service?.configured?<p className="muted">{t('ai.unconfigured')}</p>:<>
        <p className="form-note">{t('ai.note')}</p>
        <div className="button-row"><button className="button secondary" disabled={busy||!profile.cv.trim()} onClick={()=>void run('match')}><Sparkles size={16}/>{t('ai.match')}</button>
          <button className="button primary" disabled={busy||!profile.cv.trim()||job.completeness!=='full'||job.availability==='closed'} onClick={()=>void run('tailor')}><FileText size={16}/>{t('ai.tailor')}</button>
          <button className="icon-button" aria-label={t('ai.refreshHistory')} disabled={busy} onClick={()=>void reload()}><RefreshCw size={17}/></button></div>
        {busy&&<p role="status"><LoaderCircle size={17} className="spin"/> {t('ai.busy')}</p>}
        <p className="form-note">{t('ai.usage',{used:count(service.usage.used_tokens),reserved:count(service.usage.reserved_tokens),limit:service.monthlyTokenBudget?count(service.monthlyTokenBudget):t('ai.unlimited')})}</p>
      </>}
    {error&&<div className="notice error" role="alert">{error}</div>}
    {match&&matchData&&<div className="ai-result">
      <div className="section-title-row"><h4>{t(`ai.decision.${matchData.decision}`)}</h4><span className="tag">{matchData.score===null?t('ai.noScore'):t('ai.score',{score:matchData.score})}</span></div>
      {(stale(match)||matchData.provisional)&&<div className="notice">{t(stale(match)?'ai.stale.match':'ai.provisional')}</div>}
      <p>{matchData.summary}</p><p className="form-note">{t('ai.coverage',{coverage:matchData.coverage})}</p>
      <div className="requirements">{matchData.requirements.filter(r=>r.category!=='language').map((r,i)=><article key={i}><strong>{r.requirement}</strong><span className="tag">{t(`ai.status.${r.status}`)}</span><p>{r.explanation}</p><details><summary>{t('ai.showSources')}</summary><blockquote>{r.jobQuote}</blockquote>{r.evidenceIds.map(id=><p key={id}>{match.input.evidence.find(e=>e.id===id)?.text}</p>)}</details></article>)}</div>
      {!!matchData.preferenceConflicts.length&&<ul>{matchData.preferenceConflicts.map((x,i)=><li key={i}>{x}</li>)}</ul>}
      {!!matchData.questions.length&&<div><h4>{t('ai.questions')}</h4><ul>{matchData.questions.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
    </div>}
    {draft&&draftData&&<div className="ai-result">
      <h4>{t('ai.draft.title')}</h4>
      {stale(draft)&&<div className="notice">{t('ai.stale.draft',{version:draft.input.profileVersion})}</div>}
      <ul>{draftData.changeSummary.map((x,i)=><li key={i}>{x}</li>)}</ul>
      {!!draftData.questions.length&&<div className="notice"><strong>{t('ai.needsCheck')}</strong><ul>{draftData.questions.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
      <details><summary>{t('ai.viewTexts')}</summary><h4>CV</h4><pre>{draftData.cv}</pre><h4>{t('docs.tab.letter')}</h4><pre>{draftData.letter}</pre>
        {draftData.claims.map((claim,i)=><div key={i}><strong>{claim.text}</strong><ul>{claim.evidenceIds.map(id=><li key={id}>{draft.input.evidence.find(e=>e.id===id)?.text}</li>)}</ul></div>)}</details>
      <button className="button primary" onClick={()=>onPacket(draft)}><FileText size={16}/>{t('ai.saveAsPacket')}</button>
    </div>}
    {!!runs.length&&<details className="ai-history"><summary>{t('ai.history',{count:runs.length})}</summary>{runs.map(r=><p key={r.id}>{formatTime(r.created_at)} · {t(r.operation==='match'?'ai.history.match':'ai.history.tailor')} · {r.status==='succeeded'?t('ai.history.done'):r.status==='pending'?t('ai.history.pending'):serviceMessage(r.error_code||'interrupted')} · {t('ai.history.tokens',{tokens:r.charged_tokens??'—'})}{r.usage_estimated?` ${t('ai.history.estimated')}`:''}</p>)}</details>}
  </section>;
}

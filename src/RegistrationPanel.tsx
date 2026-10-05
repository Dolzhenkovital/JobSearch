import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Plus, RefreshCw } from 'lucide-react';
import { Field, formatDate } from './ui';
import { locale, useI18n } from './i18n';
import { serviceCall } from './service';
import type { RegistrationMode, RegistrationState, PromoCode } from './registration';

export function RegistrationPanel({ request = serviceCall, notify }: { request?: typeof serviceCall; notify: (message: string) => void }) {
  const { t } = useI18n();
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const number = new Intl.NumberFormat(locale());
  const [state, setState] = useState<RegistrationState | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [code, setCode] = useState(''), [kind, setKind] = useState<'limited' | 'unlimited'>('limited'), [limit, setLimit] = useState('10');
  useEffect(() => {
    let live = true;
    setBusy(true);
    request<RegistrationState>('get_registration', { page: 1 }).then(value => { if (live) setState(value); },
      failure => { if (live) setError((failure as Error).message); }).finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [request]);
  async function load(page = state?.page || 1) {
    setBusy(true); setError('');
    try { const value = await request<RegistrationState>('get_registration', { page }); if (mounted.current) setState(value); }
    catch (failure) { if (mounted.current) setError((failure as Error).message); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function change(action: string, payload: Record<string, unknown>) {
    setBusy(true); setError('');
    try {
      await request(action, payload);
      if (!mounted.current) return;
      // Refresh after mutation, so activation counts are read from the server.
      const value = await request<RegistrationState>('get_registration', { page: action === 'create_promo_code' ? 1 : state?.page || 1 });
      if (!mounted.current) return;
      setState(value);
      if (action === 'create_promo_code') setCode('');
      notify(t('registration.saved'));
    } catch (failure) { if (mounted.current) setError((failure as Error).message); }
    finally { if (mounted.current) setBusy(false); }
  }
  const status = (promo: PromoCode) => !promo.enabled ? 'registration.disabled' :
    promo.maxActivations !== null && promo.activations >= promo.maxActivations ? 'registration.exhausted' : 'registration.active';
  return <section className="registration-panel" aria-label={t('registration.title')}>
    <div className="section-title-row"><h3>{t('registration.title')}</h3>
      <button className="button secondary small" disabled={busy} onClick={() => void load()}><RefreshCw size={15}/>{t('common.refresh')}</button></div>
    {error && <div className="notice error" role="alert">{error}</div>}
    {busy && <p role="status"><LoaderCircle size={17} className="spin"/> {t('common.processing')}</p>}
    {state && <>
      <Field label={t('registration.mode')} hint={t('registration.modeHint')}>
        <select disabled={busy} value={state.mode} onChange={event => void change('set_registration_mode', { mode: event.target.value as RegistrationMode, revision: state.revision })}>
          <option value="free">{t('registration.free')}</option><option value="promo">{t('registration.promo')}</option>
        </select>
      </Field>
      {state.mode === 'promo' && !state.hasActiveCode && <p className="notice">{t('registration.noCodes')}</p>}
      <form onSubmit={event => { event.preventDefault(); void change('create_promo_code', { code, maxActivations: kind === 'limited' ? Number(limit) : null }); }}>
        <h3>{t('registration.create')}</h3>
        <Field label={t('registration.code')} hint={t('registration.codeHint')}>
          <input required minLength={4} maxLength={64} pattern="[A-Za-z0-9_-]{4,64}" autoComplete="off" value={code} disabled={busy} onChange={event => setCode(event.target.value)}/>
        </Field>
        <div className="form-grid">
          <Field label={t('registration.type')}><select value={kind} disabled={busy} onChange={event => setKind(event.target.value as typeof kind)}>
            <option value="limited">{t('registration.limited')}</option><option value="unlimited">{t('registration.unlimited')}</option>
          </select></Field>
          {kind === 'limited' && <Field label={t('registration.limit')}><input type="number" required min={1} max={1000000} step={1} value={limit} disabled={busy} onChange={event => setLimit(event.target.value)}/></Field>}
        </div>
        <button className="button primary" disabled={busy}><Plus size={17}/>{t('registration.create')}</button>
      </form>
      <p className="form-note">{t('registration.countHint')}</p>
      <div className="admin-users">{state.codes.map(promo => <article className="admin-user promo-code" key={promo.id}>
        <div><strong>{promo.code}</strong><span className="tag">{t(status(promo))}</span>
          <p>{promo.maxActivations === null ? t('registration.usedUnlimited', { used: number.format(promo.activations) }) :
            t('registration.usedLimited', { used: number.format(promo.activations), limit: number.format(promo.maxActivations), remaining: number.format(Math.max(0, promo.maxActivations - promo.activations)) })}</p>
          <p className="form-note">{t('registration.created', { date: formatDate(promo.createdAt) })}</p>
        </div>
        <button className="button secondary small" disabled={busy} onClick={() => void change('toggle_promo_code', { id: promo.id, enabled: !promo.enabled, revision: promo.revision })}>
          {t(promo.enabled ? 'registration.disable' : 'registration.enable')}
        </button>
      </article>)}</div>
      {!state.codes.length && <p>{t('registration.empty')}</p>}
      <div className="button-row"><button className="button secondary small" disabled={busy || state.page <= 1} onClick={() => void load(state.page - 1)}>{t('admin.prev')}</button>
        <span>{t('admin.page', { page: number.format(state.page) })}</span><button className="button secondary small" disabled={busy || !state.hasMore} onClick={() => void load(state.page + 1)}>{t('admin.next')}</button></div>
    </>}
  </section>;
}

import { cloud } from './cloud';
import { t } from './i18n';

export type RegistrationMode = 'free' | 'promo';
export type RegistrationCheck = { mode: RegistrationMode };
export type PromoCode = { id: string; code: string; maxActivations: number | null; activations: number;
  enabled: boolean; revision: number; createdAt: string };
export type RegistrationState = { mode: RegistrationMode; revision: number; codes: PromoCode[]; page: number; hasMore: boolean; hasActiveCode: boolean };

export async function checkRegistration(): Promise<RegistrationCheck> {
  if (!cloud) throw new Error(t('registration.unavailable'));
  const { data, error } = await cloud.rpc('registration_mode');
  // Missing migration/transport failure never silently enables signup.
  if (error || !data || !['free', 'promo'].includes(data.mode))
    throw new Error(t('registration.unavailable'));
  return data as RegistrationCheck;
}

export async function registerAccount(email: string, password: string, code: string) {
  if (!cloud) throw new Error(t('registration.unavailable'));
  const current = await checkRegistration();
  if (current.mode === 'promo' && !code.trim()) throw new Error(t('registration.inactive'));
  const result = await cloud.auth.signUp({ email, password, options: {
    emailRedirectTo: `${location.origin}${import.meta.env.BASE_URL}`,
    data: { registration_promo_code: code.trim().toUpperCase() },
  } });
  if (result.error) {
    if (result.error.message.includes('promo_code_inactive')) throw new Error(t('registration.inactive'));
    // The database trigger also protects the last activation if another signup won the race.
    // Auth masks trigger exceptions. In promo mode the trigger can reject an inactive code,
    // including one exhausted after the hook. Do not expose a public validity oracle or retry signup.
    if (result.error.code === 'unexpected_failure' || result.error.message.includes('Database error saving new user')) {
      if (current.mode === 'promo' || (await checkRegistration()).mode === 'promo')
        throw new Error(t('registration.inactive'));
      throw new Error(t('auth.failed'));
    }
    throw result.error;
  }
  return result;
}

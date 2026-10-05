// @vitest-environment jsdom
import { beforeEach, it, expect, vi } from 'vitest';
import { checkRegistration, registerAccount } from './registration';
const mock = vi.hoisted(() => ({ rpc: vi.fn(), signUp: vi.fn() }));
vi.mock('./cloud', () => ({ cloud: { rpc: mock.rpc, auth: { signUp: mock.signUp } } }));
beforeEach(() => { vi.resetAllMocks(); mock.signUp.mockResolvedValue({ data: { session: null }, error: null }); });
it('blocks missing codes and unavailable registration settings before Auth signup without exposing validity', async () => {
  mock.rpc.mockResolvedValue({ data: { mode: 'promo' }, error: null });
  await expect(registerAccount('synthetic@example.invalid', 'synthetic-password', '')).rejects.toThrow('Промокод не активний');
  expect(mock.rpc).toHaveBeenCalledWith('registration_mode');
  expect(mock.signUp).not.toHaveBeenCalled();
  mock.rpc.mockResolvedValue({ data: null, error: { message: 'missing migration' } });
  await expect(checkRegistration()).rejects.toThrow('Не вдалося перевірити');
  expect(mock.signUp).not.toHaveBeenCalled();
});
it('passes the normalized code to Auth and does not retry signup', async () => {
  mock.rpc.mockResolvedValue({ data: { mode: 'promo', valid: true }, error: null });
  await registerAccount('synthetic@example.invalid', 'synthetic-password', ' welcome ');
  expect(mock.signUp).toHaveBeenCalledWith(expect.objectContaining({ options: expect.objectContaining({ data: { registration_promo_code: 'WELCOME' } }) }));
  expect(mock.signUp).toHaveBeenCalledTimes(1);
});
it('reports masked database failures without falsely confirming code inactivity or retrying signup', async () => {
  mock.rpc.mockResolvedValue({ data: { mode: 'promo' }, error: null });
  mock.signUp.mockResolvedValue({ data: null, error: { code: 'unexpected_failure', message: 'Database error saving new user' } });
  await expect(registerAccount('synthetic@example.invalid', 'synthetic-password', 'LAST')).rejects.toThrow('Не вдалося створити акаунт');
  expect(mock.signUp).toHaveBeenCalledTimes(1);
  expect(mock.rpc).toHaveBeenCalledTimes(1);
});
it('accepts free registration, translates the hook rejection and preserves ordinary Auth errors', async () => {
  mock.rpc.mockResolvedValue({ data: { mode: 'free', valid: true }, error: null });
  await registerAccount('synthetic@example.invalid', 'synthetic-password', '');
  expect(mock.signUp).toHaveBeenCalledWith(expect.objectContaining({ options: expect.objectContaining({ data: {} }) }));
  mock.signUp.mockResolvedValue({ data: null, error: { message: 'promo_code_inactive' } });
  await expect(registerAccount('synthetic@example.invalid', 'synthetic-password', '')).rejects.toThrow('Промокод не активний');
  mock.signUp.mockResolvedValue({ data: null, error: new Error('Email rate limit exceeded') });
  await expect(registerAccount('synthetic@example.invalid', 'synthetic-password', '')).rejects.toThrow('Email rate limit exceeded');
});

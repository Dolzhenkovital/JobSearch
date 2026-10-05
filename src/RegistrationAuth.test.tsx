// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { SettingsPanel } from './Panels';
import { initialStore } from './domain';
import type { useWorkspace } from './useWorkspace';
const mock = vi.hoisted(() => ({ check: vi.fn(), register: vi.fn(), signIn: vi.fn() }));
vi.mock('./cloud', () => ({ cloud: { auth: { signInWithPassword: mock.signIn } } }));
vi.mock('./registration', () => ({ checkRegistration: mock.check, registerAccount: mock.register }));
let container: HTMLDivElement, root: Root;
const button = (name: string) => [...container.querySelectorAll('button')].find(element => element.textContent?.trim() === name)!;
const input = (name: string) => [...container.querySelectorAll('label')].find(label => label.querySelector('span')?.textContent === name)!.querySelector('input')!;
async function edit(name: string, value: string) { await act(async () => {
  const element = input(name); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}); }
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  HTMLDialogElement.prototype.showModal = vi.fn(); HTMLDialogElement.prototype.close = vi.fn(); vi.resetAllMocks();
  mock.check.mockResolvedValue({ mode: 'promo', valid: false });
  mock.register.mockResolvedValue({ data: { session: null }, error: null });
  mock.signIn.mockResolvedValue({ data: { session: {} }, error: null });
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  const workspace = { store: initialStore(), configured: true, user: null } as unknown as ReturnType<typeof useWorkspace>;
  await act(async () => root.render(<SettingsPanel workspace={workspace} initialTab="sync" onClose={() => {}} notify={() => {}}/>));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
it('requires a code only for registration and preserves ordinary sign-in', async () => {
  await edit('Email', 'synthetic@example.invalid'); await edit('Пароль', 'synthetic-password');
  await act(async () => button('Увійти').click());
  expect(mock.signIn).toHaveBeenCalled(); expect(mock.check).not.toHaveBeenCalled();
  await act(async () => container.querySelector<HTMLButtonElement>('.switch-auth')!.click());
  expect(input('Промокод').required).toBe(true);
  await edit('Промокод', 'BETA');
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(mock.register).toHaveBeenCalledWith('synthetic@example.invalid', '', 'BETA');
  expect(container.textContent).toContain('Перевірте пошту');
});
it('blocks submission when registration requirements are unavailable and permits refresh', async () => {
  mock.check.mockRejectedValueOnce(new Error('Не вдалося перевірити умови реєстрації.'));
  await act(async () => container.querySelector<HTMLButtonElement>('.switch-auth')!.click());
  expect(button('Створити акаунт').disabled).toBe(true);
  expect(container.querySelector('[role=alert]')!.textContent).toContain('Не вдалося перевірити');
  await act(async () => button('Оновити').click());
  expect(button('Створити акаунт').disabled).toBe(false);
});
it('refreshes the mode when an admin restricts a previously open signup form', async () => {
  mock.check.mockResolvedValueOnce({ mode: 'free', valid: true });
  await act(async () => container.querySelector<HTMLButtonElement>('.switch-auth')!.click());
  expect(container.textContent).not.toContain('Промокод');
  mock.register.mockRejectedValueOnce(new Error('Промокод не активний.'));
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(input('Промокод').required).toBe(true);
  expect(container.textContent).toContain('Промокод не активний.');
});

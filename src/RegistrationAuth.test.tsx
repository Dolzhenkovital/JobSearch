// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, it, expect, vi, type Mock } from 'vitest';
import { SettingsPanel } from './Panels';
import { initialStore } from './domain';
import type { useWorkspace } from './useWorkspace';
const mock = vi.hoisted(() => ({ check: vi.fn(), register: vi.fn(), signIn: vi.fn() }));
vi.mock('./cloud', () => ({ cloud: { auth: { signInWithPassword: mock.signIn } } }));
vi.mock('./registration', () => ({ checkRegistration: mock.check, registerAccount: mock.register }));
let container: HTMLDivElement, root: Root;
let workspace: ReturnType<typeof useWorkspace>;
let notify: Mock<(message: string) => void>;
async function renderWorkspace() {
  await act(async () => root.render(<SettingsPanel workspace={workspace} initialTab="sync" onClose={() => {}} notify={notify}/>));
}
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
  workspace = { store: initialStore(), configured: true, user: null } as unknown as ReturnType<typeof useWorkspace>;
  notify = vi.fn();
  await renderWorkspace();
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
it('requires a code only for registration and preserves ordinary sign-in', async () => {
  await edit('Email', 'synthetic@example.invalid'); await edit('Пароль', 'synthetic-password');
  await act(async () => button('Увійти').click());
  expect(mock.signIn).toHaveBeenCalled(); expect(mock.check).not.toHaveBeenCalled();
  await act(async () => container.querySelector<HTMLButtonElement>('.switch-auth')!.click());
  expect(input('Промокод').required).toBe(true);
  await edit('Пароль', 'synthetic-password');
  await edit('Промокод', 'BETA');
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(mock.register).toHaveBeenCalledWith('synthetic@example.invalid', 'synthetic-password', 'BETA');
  expect(container.textContent).toContain('Перевірте пошту');
  expect(container.textContent).not.toContain('Промокод');
  expect(button('Увійти')).toBeDefined();
});
it('finishes signup even when Auth returns an immediate session', async () => {
  mock.register.mockResolvedValueOnce({ data: { session: {} }, error: null });
  await act(async () => container.querySelector<HTMLButtonElement>('.switch-auth')!.click());
  await edit('Email', 'synthetic@example.invalid'); await edit('Пароль', 'synthetic-password'); await edit('Промокод', 'BETA');
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(mock.register).toHaveBeenCalledTimes(1);
  expect(input('Пароль').value).toBe('');
  expect(container.textContent).not.toContain('Промокод');
  expect(button('Увійти').disabled).toBe(false);
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
it('clears credentials, promo code and messages when an account enters and leaves the open form', async () => {
  await act(async () => container.querySelector<HTMLButtonElement>('.switch-auth')!.click());
  await edit('Email', 'synthetic@example.invalid'); await edit('Пароль', 'synthetic-password'); await edit('Промокод', 'PRIVATE-CODE');
  mock.register.mockRejectedValueOnce(new Error('Old account message'));
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(container.textContent).toContain('Old account message');
  workspace = { ...workspace, user: { id: 'another-account', email: 'another@example.invalid' } } as ReturnType<typeof useWorkspace>;
  await renderWorkspace();
  workspace = { ...workspace, user: null };
  await renderWorkspace();
  expect(input('Email').value).toBe(''); expect(input('Пароль').value).toBe('');
  expect(container.textContent).not.toContain('Old account message');
  expect(container.textContent).not.toContain('Промокод');
  await act(async () => container.querySelector<HTMLButtonElement>('.switch-auth')!.click());
  expect(input('Промокод').value).toBe('');
});
it('clears credential drafts when cloud configuration becomes unavailable', async () => {
  await edit('Email', 'synthetic@example.invalid'); await edit('Пароль', 'synthetic-password');
  workspace = { ...workspace, configured: false }; await renderWorkspace();
  workspace = { ...workspace, configured: true }; await renderWorkspace();
  expect(input('Email').value).toBe(''); expect(input('Пароль').value).toBe('');
});
it('ignores a late signup result after the form switches account and prevents duplicate submits', async () => {
  let finish!: (value: unknown) => void;
  mock.register.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  await act(async () => container.querySelector<HTMLButtonElement>('.switch-auth')!.click());
  await edit('Email', 'synthetic@example.invalid'); await edit('Пароль', 'synthetic-password'); await edit('Промокод', 'ONCE');
  await act(async () => {
    const form = container.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  expect(mock.register).toHaveBeenCalledTimes(1);
  workspace = { ...workspace, user: { id: 'another-account', email: 'another@example.invalid' } } as ReturnType<typeof useWorkspace>;
  await renderWorkspace();
  await act(async () => finish({ data: { session: {} }, error: null }));
  expect(notify).not.toHaveBeenCalled();
  workspace = { ...workspace, user: null }; await renderWorkspace();
  expect(input('Email').value).toBe(''); expect(input('Пароль').value).toBe('');
  expect(button('Увійти').disabled).toBe(false);
});

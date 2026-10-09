// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import { RegistrationPanel } from './RegistrationPanel';
import type { RegistrationState } from './registration';
import type { serviceCall } from './service';
vi.mock('./cloud', () => ({ cloud: null }));
let root: Root, container: HTMLDivElement, state: RegistrationState;
const notify = vi.fn();
const request = vi.fn(async (action: string) => action === 'get_registration' ? state : { ok: true });
const button = (name: string) => [...container.querySelectorAll('button')].find(element => element.textContent === name)!;
async function edit(element: HTMLInputElement | HTMLSelectElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value')!.set!.call(element, value);
    element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  state = { mode: 'promo', revision: 3, page: 1, hasMore: false, hasActiveCode: false, codes: [
    { id: 'limited', code: 'LIMITED', maxActivations: 2, activations: 2, enabled: true, revision: 1, createdAt: '2026-10-05' },
    { id: 'unlimited', code: 'UNLIMITED', maxActivations: null, activations: 5, enabled: false, revision: 4, createdAt: '2026-10-05' },
  ] };
  vi.clearAllMocks();
  await act(async () => root.render(<RegistrationPanel request={request as typeof serviceCall} notify={notify}/>));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
it('reports a saved mutation and blocks stale actions when refreshing fails until a successful reload', async () => {
  await edit(container.querySelector('input')!, 'ONCE');
  request.mockResolvedValueOnce({ ok: true }).mockRejectedValueOnce(new Error('Network unavailable'));
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(notify).toHaveBeenCalledWith('Налаштування реєстрації збережено.');
  expect(container.querySelector('[role=alert]')!.textContent).toContain('Зміни збережено');
  expect(container.querySelector('form')).toBeNull();
  expect(container.querySelector('select')).toBeNull();
  expect(button('Оновити').disabled).toBe(false);
  await act(async () => button('Оновити').click());
  expect(container.querySelector('[role=alert]')).toBeNull();
  expect(container.querySelector('input')!.value).toBe('');
  expect(request.mock.calls.filter(([action]) => action === 'create_promo_code')).toHaveLength(1);
});
it('renders exhausted limits and disabled unlimited codes with their actual counts', () => {
  expect(container.textContent).toContain('Без активного промокоду');
  expect(container.textContent).toContain('Активації вичерпано');
  expect(container.textContent).toContain('Зареєстровано: 2 із 2. Залишилося: 0.');
  expect(container.textContent).toContain('Зареєстровано: 5. Без обмеження активацій.');
});
it('uses the server aggregate across pages and formats large counts for the interface locale', async () => {
  state.hasActiveCode = true;
  state.codes[0].maxActivations = 1000000;
  state.codes[0].activations = 2000;
  await act(async () => button('Оновити').click());
  expect(container.textContent).not.toContain('Без активного промокоду');
  expect(container.textContent).toContain(new Intl.NumberFormat('uk-UA').format(1000000));
});
it('sends revision-checked mode changes and enables an unlimited code without resetting its count', async () => {
  await edit(container.querySelector('select')!, 'free');
  expect(request).toHaveBeenCalledWith('set_registration_mode', { mode: 'free', revision: 3 });
  await act(async () => button('Увімкнути').click());
  expect(request).toHaveBeenCalledWith('toggle_promo_code', { id: 'unlimited', enabled: true, revision: 4 });
  expect(request).toHaveBeenCalledWith('get_registration', { page: 1 });
});
it('creates limited and unlimited codes and shows server conflicts inside the panel', async () => {
  await edit(container.querySelector('input')!, 'NEWCODE');
  await edit(container.querySelector('input[type=number]')!, '7');
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(request).toHaveBeenCalledWith('create_promo_code', { code: 'NEWCODE', maxActivations: 7 });
  await edit(container.querySelector('input')!, 'OTHER');
  await edit(container.querySelectorAll('select')[1], 'unlimited');
  expect(container.querySelector('input[type=number]')).toBeNull();
  request.mockRejectedValueOnce(new Error('Такий промокод уже існує.'));
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(request).toHaveBeenCalledWith('create_promo_code', { code: 'OTHER', maxActivations: null });
  expect(container.querySelector('[role=alert]')!.textContent).toContain('Такий промокод уже існує.');
  expect(container.querySelector('form')).toBeNull();
  await act(async () => button('Оновити').click());
  expect(container.querySelector('input')!.value).toBe('OTHER');
});
it('blocks duplicate synchronous mutations and requires refresh after an ambiguous response', async () => {
  let rejectMutation!: (error: Error) => void;
  request.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectMutation = reject; }));
  await edit(container.querySelector('input')!, 'ONCE');
  await act(async () => {
    const form = container.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  expect(request.mock.calls.filter(([action]) => action === 'create_promo_code')).toHaveLength(1);
  await act(async () => rejectMutation(new Error('Connection lost')));
  expect(container.querySelector('form')).toBeNull();
  expect(container.querySelector('[role=alert]')!.textContent).toContain('Connection lost');
  expect(notify).not.toHaveBeenCalled();
  await act(async () => button('Оновити').click());
  expect(container.querySelector('input')!.value).toBe('ONCE');
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(request.mock.calls.filter(([action]) => action === 'create_promo_code')).toHaveLength(2);
});

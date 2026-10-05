import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
const db = new PGlite();
const admin = '00000000-0000-4000-8000-000000000001';
const member = '00000000-0000-4000-8000-000000000002';
let sequence = 10;
const nextUser = () => `00000000-0000-4000-8000-${String(sequence++).padStart(12, '0')}`;
async function role(value: string) { await db.exec(`reset role; set role ${value}`); }
async function create(code: string, max: number | null) {
  await role('service_role');
  await db.query('select public.registration_create_code($1,$2,$3)', [admin, code, max]);
}
async function signup(code?: string, id = nextUser()) {
  await role('supabase_auth_admin');
  await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',
    [id, JSON.stringify({ registration_promo_code: code, display_name: 'Synthetic' })]);
  return id;
}
async function count(code: string) {
  await role('postgres');
  return Number((await db.query<{ activations: number }>('select activations from private.promo_codes where code=$1', [code])).rows[0].activations);
}
describe('registration quotas enforced by the Auth insert transaction', () => {
  beforeAll(async () => {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create role supabase_auth_admin; create schema auth;
      create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
      grant usage on schema auth to supabase_auth_admin;
      grant all on auth.users to supabase_auth_admin;
      insert into auth.users(id) values('${admin}'),('${member}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
    await db.exec(readFileSync(new URL('../supabase/migrations/202610020001_admin_llm.sql', import.meta.url), 'utf8'));
    await db.query('insert into public.app_admins(user_id) values($1)', [admin]);
    await db.exec(readFileSync(new URL('../supabase/migrations/202610050001_registration.sql', import.meta.url), 'utf8'));
  }, 30000);
  afterAll(() => db.close());
  it('starts promo-only and blocks direct Auth creation without a valid code, including without the hook', async () => {
    await role('anon');
    expect((await db.query<{ result: unknown }>('select public.registration_mode() result')).rows[0].result).toEqual({ mode: 'promo' });
    await expect(db.query("select public.registration_check('GUESS')")).rejects.toThrow('does not exist');
    await expect(signup()).rejects.toThrow('promo_code_inactive');
    await expect(signup('UNKNOWN')).rejects.toThrow('promo_code_inactive');
    await role('postgres');
    expect((await db.query<{ count: number }>('select count(*) from auth.users')).rows[0].count).toBe(2);
  });
  it('caps actual new accounts, normalizes case, and keeps provenance independent of editable metadata', async () => {
    await create('LIMITED', 2);
    const user = await signup(' limited ');
    await signup('Limited');
    await expect(signup('LIMITED')).rejects.toThrow('promo_code_inactive');
    expect(await count('LIMITED')).toBe(2);
    await db.query('update auth.users set raw_user_meta_data=$1 where id=$2', ['{"registration_promo_code":"FORGED"}', user]);
    await role('service_role');
    expect((await db.query<{ result: Record<string, string> }>('select public.registration_user_codes($1,$2) result', [admin, [user]])).rows[0].result).toEqual({ [user]: 'LIMITED' });
  });
  it('does not spend a code on a failed account transaction or recreate an existing account', async () => {
    await create('ROLLBACK', 1);
    await role('supabase_auth_admin');
    await expect(db.transaction(async tx => {
      await tx.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)', [nextUser(), '{"registration_promo_code":"ROLLBACK"}']);
      throw new Error('later Auth failure');
    })).rejects.toThrow('later Auth failure');
    expect(await count('ROLLBACK')).toBe(0);
    await expect(signup('ROLLBACK', member)).rejects.toThrow('duplicate key');
    expect(await count('ROLLBACK')).toBe(0);
    await signup('ROLLBACK');
    expect(await count('ROLLBACK')).toBe(1);
  });
  it('keeps unlimited codes usable until manually disabled and does not reset their history', async () => {
    await create('UNLIMITED', null);
    const user = await signup('UNLIMITED'); await signup('UNLIMITED');
    await role('postgres');
    const promo = (await db.query<{ id: string }>("select id from private.promo_codes where code='UNLIMITED'")).rows[0];
    await role('service_role');
    await db.query('select public.registration_toggle_code($1,$2,false,1)', [admin, promo.id]);
    await expect(signup('UNLIMITED')).rejects.toThrow('promo_code_inactive');
    await role('service_role');
    await db.query('select public.registration_toggle_code($1,$2,true,2)', [admin, promo.id]);
    await signup('UNLIMITED');
    expect(await count('UNLIMITED')).toBe(3);
    await db.query('delete from auth.users where id=$1', [user]);
    expect(await count('UNLIMITED')).toBe(3);
    expect((await db.query<{ count: number }>('select count(*) from private.promo_registrations where promo_id=$1 and user_id is null', [promo.id])).rows[0].count).toBe(1);
  });
  it('does not give exhausted codes more activations when enabled again', async () => {
    await role('postgres');
    const promo = (await db.query<{ id: string }>("select id from private.promo_codes where code='LIMITED'")).rows[0];
    await role('service_role');
    await db.query('select public.registration_toggle_code($1,$2,false,1)', [admin, promo.id]);
    await db.query('select public.registration_toggle_code($1,$2,true,2)', [admin, promo.id]);
    await expect(signup('LIMITED')).rejects.toThrow('promo_code_inactive');
  });
  it('supports open registration and rejects stale administrator updates without changing the mode', async () => {
    await role('service_role');
    await db.query("select public.registration_set_mode($1,'free',1)", [admin]);
    await expect(db.query("select public.registration_set_mode($1,'promo',1)", [admin])).rejects.toThrow('registration_conflict');
    await signup();
    await role('service_role');
    const state = (await db.query<{ result: { mode: string; codes: { code: string; activations: number }[] } }>('select public.registration_admin_state($1,1) result', [admin])).rows[0].result;
    expect(state.mode).toBe('free'); expect(state.codes.find(c => c.code === 'LIMITED')?.activations).toBe(2);
    await db.query("select public.registration_set_mode($1,'promo',2)", [admin]);
  });
  it('prevents anonymous/authenticated access to admin RPCs, private code lists and counters', async () => {
    for (const caller of ['anon', 'authenticated']) {
      await role(caller);
      await expect(db.query('select * from private.promo_codes')).rejects.toThrow('permission denied');
      await expect(db.query('select public.registration_admin_state($1,1)', [admin])).rejects.toThrow('permission denied');
      await expect(db.query("select public.registration_before_user_created('{}')")).rejects.toThrow('permission denied');
      await expect(db.query('select public.registration_create_code($1,$2,null)', [admin, 'FORGED'])).rejects.toThrow('permission denied');
    }
    await role('service_role');
    await expect(db.query('select public.registration_create_code($1,$2,null)', [member, 'FORGED'])).rejects.toThrow('admin_required');
    await expect(db.query('select public.registration_create_code($1,$2,null)', [admin, 'limited'])).rejects.toThrow('promo_code_exists');
    await expect(db.query('select public.registration_create_code($1,$2,0)', [admin, 'ZERO'])).rejects.toThrow('invalid_input');
  });
  it('the optional Auth hook returns a readable inactive error without spending an activation', async () => {
    await create('HOOK', 1);
    await role('supabase_auth_admin');
    const hook = (code: string) => db.query<{ result: unknown }>('select public.registration_before_user_created($1) result',
      [JSON.stringify({ user: { user_metadata: { registration_promo_code: code } } })]);
    expect((await hook('HOOK')).rows[0].result).toEqual({});
    expect((await hook('LIMITED')).rows[0].result).toEqual({ error: { http_code: 400, message: 'promo_code_inactive' } });
    expect(await count('HOOK')).toBe(0);
  });
  it('reports whether any usable code exists independently of the requested page', async () => {
    await role('postgres');
    await db.exec('begin; update private.promo_codes set enabled = false;');
    await role('service_role');
    const state = () => db.query<{ result: { codes: unknown[]; hasActiveCode: boolean } }>('select public.registration_admin_state($1,2) result', [admin]);
    expect((await state()).rows[0].result).toMatchObject({ codes: [], hasActiveCode: false });
    await db.query('select public.registration_create_code($1,$2,1)', [admin, 'OTHER-PAGE']);
    expect((await state()).rows[0].result).toMatchObject({ codes: [], hasActiveCode: true });
    await db.exec('rollback');
  });
});

import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
const db=new PGlite();
const admin='00000000-0000-4000-8000-000000000001',user='00000000-0000-4000-8000-000000000002';
const runA='00000000-0000-4000-8000-000000000011',runB='00000000-0000-4000-8000-000000000012';
async function asRole(role:string,id=''){await db.exec(`reset role; set role ${role};`);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);}
async function reserve(id:string,owner=user,tokens=700){return db.query<{result:{created:boolean}}>(
  "select public.llm_reserve($1,$2,'match','hash','{}', $3,2,'rules') as result",[id,owner,tokens]);}
describe('admin privileges and atomic LLM budget',()=>{
  beforeAll(async()=>{
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;create table auth.users(id uuid primary key);
      insert into auth.users values('${admin}'),('${user}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to anon,authenticated,service_role;`);
    await db.exec(readFileSync(new URL('../supabase/migrations/202610020001_admin_llm.sql',import.meta.url),'utf8'));
    await db.query('insert into public.app_admins(user_id) values($1)',[admin]);
    await asRole('service_role');
    await db.query("select public.llm_save_config($1,'{\"baseUrl\":\"https://api.example.com/v1\",\"model\":\"synthetic\",\"monthlyTokenBudget\":1000}', 'synthetic-key',1)",[admin]);
  },30000);
  afterAll(()=>db.close());
  it('protects roles, provider secrets and service-only operations from ordinary users',async()=>{
    await asRole('authenticated',user);
    expect((await db.query<{allowed:boolean}>('select public.is_app_admin() allowed')).rows[0].allowed).toBe(false);
    await expect(db.query('insert into public.app_admins(user_id) values($1)',[user])).rejects.toThrow('permission denied');
    await expect(db.query('select public.llm_server_config()')).rejects.toThrow('permission denied');
    await expect(db.query('select * from private.llm_settings')).rejects.toThrow('permission denied');
    await expect(reserve(runA)).rejects.toThrow('permission denied');
    await asRole('authenticated',admin);
    expect((await db.query<{allowed:boolean}>('select public.is_app_admin() allowed')).rows[0].allowed).toBe(true);
    await expect(db.query('select public.llm_server_config()')).rejects.toThrow('permission denied');
    await asRole('anon');await expect(db.query('select public.is_app_admin()')).rejects.toThrow('permission denied');
  });
  it('reserves per user, deduplicates IDs and rejects spending beyond the budget',async()=>{
    await asRole('service_role');
    expect((await reserve(runA)).rows[0].result.created).toBe(true);
    expect((await reserve(runA)).rows[0].result.created).toBe(false);
    await expect(reserve(runB)).rejects.toThrow('budget_exceeded');
    await expect(reserve(runA,admin)).rejects.toThrow('request_conflict');
    expect((await reserve(runB,admin)).rows[0].result.created).toBe(true);
    await db.query("select public.llm_complete($1,'succeeded','{}',null,100,200)",[runA]);
    await db.query("select public.llm_complete($1,'succeeded','{}',null,100,200)",[runA]);
    const usage=await db.query<{used_tokens:number;reserved_tokens:number}>('select used_tokens,reserved_tokens from public.llm_usage where user_id=$1',[user]);
    expect(Number(usage.rows[0].used_tokens)).toBe(300);expect(Number(usage.rows[0].reserved_tokens)).toBe(0);
  });
  it('keeps reports and usage private, with no client mutation',async()=>{
    await asRole('authenticated',user);
    expect((await db.query('select id from public.llm_runs')).rows).toEqual([{id:runA}]);
    await expect(db.query("update public.llm_runs set status='succeeded'")).rejects.toThrow('permission denied');
    await expect(db.query('update public.llm_usage set used_tokens=0')).rejects.toThrow('permission denied');
    await asRole('authenticated',admin);
    expect((await db.query('select id from public.llm_runs')).rows).toEqual([{id:runB}]);
  });
  it('charges an ambiguous call conservatively and protects admins from deletion',async()=>{
    await asRole('service_role');
    await db.query("select public.llm_complete($1,'uncertain',null,'timeout',null,null)",[runB]);
    const result=await db.query<{charged_tokens:number;usage_estimated:boolean}>('select charged_tokens,usage_estimated from public.llm_runs where id=$1',[runB]);
    expect(Number(result.rows[0].charged_tokens)).toBe(700);expect(result.rows[0].usage_estimated).toBe(true);
    await expect(db.query("select public.admin_action_guard($1,$1,'delete_user')",[admin])).rejects.toThrow('admin_delete_protected');
    await expect(db.query("select public.admin_action_guard($1,$2,'delete_user')",[user,admin])).rejects.toThrow('admin_required');
    await db.query("select public.admin_action_guard($1,$2,'reset_password')",[admin,user]);
    await expect(db.query("select public.admin_action_guard($1,$2,'reset_password')",[admin,user])).rejects.toThrow('action_rate_limited');
  });
  it('checks config revisions and supports zero as unlimited without resetting existing usage',async()=>{
    await asRole('service_role');
    await expect(db.query("select public.llm_save_config($1,'{}',null,1)",[admin])).rejects.toThrow('config_conflict');
    await db.query("select public.llm_save_config($1,'{\"model\":\"synthetic\",\"monthlyTokenBudget\":0}',null,2)",[admin]);
    const res=await db.query("select public.llm_reserve('00000000-0000-4000-8000-000000000013',$1,'match','hash','{}',20000,3,'rules')",[user]);
    expect(res.rows).toHaveLength(1);
    expect(Number((await db.query<{used_tokens:number}>('select used_tokens from public.llm_usage where user_id=$1',[user])).rows[0].used_tokens)).toBe(300);
  });
});

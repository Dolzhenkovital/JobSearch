-- Administration and metered inference. No personal identifiers or provider keys in migrations.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
revoke all on public.app_admins from anon, authenticated;
grant all on public.app_admins to service_role;

create function public.is_app_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.app_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated;

create table private.llm_settings (
  id boolean primary key default true check (id),
  config jsonb not null default '{"baseUrl":"https://api.openai.com/v1","model":"","apiFormat":"responses","reasoningEffort":"default","monthlyTokenBudget":0}',
  api_key text not null default '',
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
insert into private.llm_settings(id) values(true);
alter table private.llm_settings enable row level security;
revoke all on private.llm_settings from public, anon, authenticated;

create function public.llm_server_config() returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object('config', config, 'apiKey', api_key, 'revision', revision)
  from private.llm_settings where id;
$$;
create function public.llm_save_config(p_actor uuid, p_config jsonb, p_api_key text, p_revision bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare next_revision bigint;
begin
  if not exists(select 1 from public.app_admins where user_id = p_actor) then raise exception 'admin_required'; end if;
  if jsonb_typeof(p_config) <> 'object' or (p_config->>'monthlyTokenBudget')::bigint < 0 then raise exception 'invalid_config'; end if;
  update private.llm_settings set config = p_config,
    api_key = coalesce(p_api_key, api_key), revision = revision + 1, updated_at = now()
    where id and revision = p_revision returning revision into next_revision;
  if next_revision is null then raise exception 'config_conflict'; end if;
  return next_revision;
end;
$$;

create table public.llm_usage (
  user_id uuid references auth.users(id) on delete cascade,
  month date not null,
  used_tokens bigint not null default 0 check (used_tokens >= 0),
  reserved_tokens bigint not null default 0 check (reserved_tokens >= 0),
  primary key(user_id, month)
);
create table public.llm_runs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null check (operation in ('match', 'tailor')),
  input_hash text not null,
  input jsonb not null,
  result jsonb,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'uncertain')),
  error_code text,
  model text not null,
  config_revision bigint not null,
  rules_version text not null,
  month date not null,
  reserved_tokens bigint not null check (reserved_tokens >= 0),
  input_tokens bigint,
  output_tokens bigint,
  charged_tokens bigint,
  usage_estimated boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index llm_runs_owner_created on public.llm_runs(user_id, created_at desc);
alter table public.llm_usage enable row level security;
alter table public.llm_runs enable row level security;
revoke all on public.llm_usage, public.llm_runs from anon, authenticated;
grant select on public.llm_usage, public.llm_runs to authenticated;
grant all on public.llm_usage, public.llm_runs to service_role;
create policy own_llm_usage on public.llm_usage for select to authenticated using ((select auth.uid()) = user_id);
create policy own_llm_runs on public.llm_runs for select to authenticated using ((select auth.uid()) = user_id);

create function public.llm_reserve(p_id uuid, p_user uuid, p_operation text, p_hash text,
  p_input jsonb, p_reserve bigint, p_config_revision bigint, p_rules text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare cfg private.llm_settings; usage public.llm_usage; existing public.llm_runs;
  billing_month date := date_trunc('month', now() at time zone 'UTC')::date;
  budget bigint;
begin
  -- Serialize duplicate IDs before quota accounting; per-user row locks serialize concurrent spending.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  select * into existing from public.llm_runs where id = p_id;
  if found then
    if existing.user_id <> p_user or existing.input_hash <> p_hash or existing.operation <> p_operation then
      raise exception 'request_conflict';
    end if;
    return jsonb_build_object('created', false, 'run', to_jsonb(existing));
  end if;
  select * into cfg from private.llm_settings where id for share;
  if cfg.revision <> p_config_revision then raise exception 'config_conflict'; end if;
  if cfg.api_key = '' or coalesce(cfg.config->>'model', '') = '' then raise exception 'llm_unconfigured'; end if;
  if p_reserve <= 0 or p_reserve > 250000 or octet_length(p_input::text) > 180000 then raise exception 'input_too_large'; end if;
  budget := (cfg.config->>'monthlyTokenBudget')::bigint;
  insert into public.llm_usage(user_id, month) values(p_user, billing_month) on conflict do nothing;
  select * into usage from public.llm_usage where user_id = p_user and month = billing_month for update;
  if budget > 0 and usage.used_tokens + usage.reserved_tokens + p_reserve > budget then raise exception 'budget_exceeded'; end if;
  if exists(select 1 from public.llm_runs where user_id=p_user and status='pending') then raise exception 'request_in_progress'; end if;
  update public.llm_usage set reserved_tokens = reserved_tokens + p_reserve where user_id=p_user and month=billing_month;
  insert into public.llm_runs(id,user_id,operation,input_hash,input,model,config_revision,rules_version,month,reserved_tokens)
    values(p_id,p_user,p_operation,p_hash,p_input,cfg.config->>'model',cfg.revision,p_rules,billing_month,p_reserve)
    returning * into existing;
  return jsonb_build_object('created', true, 'run', to_jsonb(existing));
end;
$$;

create function public.llm_complete(p_id uuid, p_status text, p_result jsonb, p_error text,
  p_input_tokens bigint, p_output_tokens bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare current_run public.llm_runs; charged bigint;
begin
  select * into current_run from public.llm_runs where id = p_id for update;
  if not found then raise exception 'run_not_found'; end if;
  if current_run.status <> 'pending' then return to_jsonb(current_run); end if;
  if p_status not in ('succeeded','failed','uncertain') then raise exception 'invalid_status'; end if;
  if p_input_tokens < 0 or p_output_tokens < 0 then raise exception 'invalid_usage'; end if;
  charged := case when p_input_tokens is null or p_output_tokens is null then current_run.reserved_tokens
    else p_input_tokens + p_output_tokens end;
  update public.llm_usage set used_tokens = used_tokens + charged,
    reserved_tokens = reserved_tokens - current_run.reserved_tokens
    where user_id = current_run.user_id and month = current_run.month;
  update public.llm_runs set status=p_status, result=p_result, error_code=p_error,
    input_tokens=p_input_tokens, output_tokens=p_output_tokens, charged_tokens=charged,
    usage_estimated=(p_input_tokens is null or p_output_tokens is null), completed_at=now()
    where id=p_id returning * into current_run;
  return to_jsonb(current_run);
end;
$$;

-- A terminated function may never settle. Charge its reservation conservatively instead of
-- freeing tokens for an automatic duplicate paid request. Never rerun these IDs automatically.
create function public.llm_reconcile_expired(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare item record;
begin
  for item in select id from public.llm_runs where user_id=p_user and status='pending'
    and created_at < now() - interval '5 minutes' loop
    perform public.llm_complete(item.id, 'uncertain', null, 'interrupted', null, null);
  end loop;
end;
$$;

create table private.admin_events (
  id bigint generated always as identity primary key,
  actor uuid, target uuid, action text not null, created_at timestamptz not null default now()
);
alter table private.admin_events enable row level security;
revoke all on private.admin_events from public, anon, authenticated;
create function public.admin_action_guard(p_actor uuid, p_target uuid, p_action text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.app_admins where user_id=p_actor) then raise exception 'admin_required'; end if;
  if p_action not in ('reset_password','delete_user') then raise exception 'invalid_action'; end if;
  if p_action='delete_user' and (p_actor=p_target or exists(select 1 from public.app_admins where user_id=p_target)) then
    raise exception 'admin_delete_protected';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_target::text || p_action, 0));
  if exists(select 1 from private.admin_events where target=p_target and action=p_action and created_at > now()-interval '60 seconds') then
    raise exception 'action_rate_limited';
  end if;
  insert into private.admin_events(actor,target,action) values(p_actor,p_target,p_action);
end;
$$;

revoke all on function public.llm_server_config(), public.llm_save_config(uuid,jsonb,text,bigint),
  public.llm_reserve(uuid,uuid,text,text,jsonb,bigint,bigint,text), public.llm_complete(uuid,text,jsonb,text,bigint,bigint),
  public.llm_reconcile_expired(uuid), public.admin_action_guard(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.llm_server_config(), public.llm_save_config(uuid,jsonb,text,bigint),
  public.llm_reserve(uuid,uuid,text,text,jsonb,bigint,bigint,text), public.llm_complete(uuid,text,jsonb,text,bigint,bigint),
  public.llm_reconcile_expired(uuid), public.admin_action_guard(uuid,uuid,text) to service_role;

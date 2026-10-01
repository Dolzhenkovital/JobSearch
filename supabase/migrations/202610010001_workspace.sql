-- A private workspace per authenticated account. No service-role key belongs in the browser.
create table if not exists public.workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint workspace_size check (octet_length(payload::text) <= 5242880)
);
alter table public.workspaces enable row level security;
revoke all on public.workspaces from anon;
grant select, insert, update on public.workspaces to authenticated;
create policy "Users read their own workspace" on public.workspaces for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users create their own workspace" on public.workspaces for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update their own workspace" on public.workspaces for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.save_workspace(workspace_payload jsonb, expected_revision bigint)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare saved_revision bigint;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if workspace_payload->>'schemaVersion' is distinct from '1' then raise exception 'invalid_workspace'; end if;
  if expected_revision = 0 then
    insert into public.workspaces(user_id, payload) values(auth.uid(), workspace_payload)
    on conflict(user_id) do nothing returning revision into saved_revision;
  else
    update public.workspaces set payload = workspace_payload, revision = revision + 1, updated_at = now()
    where user_id = auth.uid() and revision = expected_revision returning revision into saved_revision;
  end if;
  if saved_revision is null then raise exception 'workspace_conflict'; end if;
  return saved_revision;
end;
$$;
revoke all on function public.save_workspace(jsonb, bigint) from public, anon;
grant execute on function public.save_workspace(jsonb, bigint) to authenticated;

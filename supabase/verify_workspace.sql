-- Run in the Supabase SQL editor as postgres after the migration.
-- Synthetic users and workspaces exist only inside this rolled-back transaction.
begin;
-- The registration migration closes new accounts by default. Open only this test transaction;
-- rollback restores the configured mode and removes all synthetic accounts below.
do $$
declare updated_rows integer;
begin
  if to_regclass('private.registration_settings') is not null then
    execute 'update private.registration_settings set mode = ''free'' where id';
    get diagnostics updated_rows = row_count;
    if updated_rows <> 1 then raise exception 'registration_settings_missing'; end if;
  end if;
end $$;
select set_config('jobsearch.test_alice', gen_random_uuid()::text, true);
select set_config('jobsearch.test_bob', gen_random_uuid()::text, true);
insert into auth.users(id) values
  (current_setting('jobsearch.test_alice')::uuid),
  (current_setting('jobsearch.test_bob')::uuid);

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('jobsearch.test_alice'), true);
do $$
begin
  if public.save_workspace('{"schemaVersion":1,"test":"first device"}', 0) <> 1 then raise exception 'initial_write_failed'; end if;
  if public.save_workspace('{"schemaVersion":1,"test":"second device"}', 1) <> 2 then raise exception 'revision_update_failed'; end if;
  begin
    perform public.save_workspace('{"schemaVersion":1,"test":"stale device"}', 1);
    raise exception 'stale_write_was_allowed';
  exception when raise_exception then
    if sqlerrm <> 'workspace_conflict' then raise; end if;
  end;
  if (select revision from public.workspaces) <> 2 then raise exception 'revision_changed_after_conflict'; end if;
end $$;

select set_config('request.jwt.claim.sub', current_setting('jobsearch.test_bob'), true);
do $$
begin
  if exists(select 1 from public.workspaces) then raise exception 'other_account_can_read'; end if;
  update public.workspaces set revision = 99 where user_id = current_setting('jobsearch.test_alice')::uuid;
  if found then raise exception 'other_account_can_update'; end if;
  begin
    insert into public.workspaces(user_id, payload) values(current_setting('jobsearch.test_alice')::uuid, '{"schemaVersion":1}');
    raise exception 'other_account_can_insert';
  exception when insufficient_privilege then null;
  end;
  if public.save_workspace('{"schemaVersion":1,"test":"separate account"}', 0) <> 1 then raise exception 'separate_account_write_failed'; end if;
  if (select count(*) from public.workspaces) <> 1 then raise exception 'account_isolation_failed'; end if;
end $$;

set local role anon;
do $$
begin
  begin
    perform 1 from public.workspaces;
    raise exception 'anonymous_read_was_allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.save_workspace('{"schemaVersion":1}', 0);
    raise exception 'anonymous_write_was_allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
select 'PASS: owner writes, stale revision rejected, account isolation, anonymous access denied. Synthetic data rolled back.' as verification;

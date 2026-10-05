-- Registration is enforced inside the Auth insert transaction, including direct Auth requests.
-- No existing account is changed. New installations start in promo-only mode without seeded codes.
create table private.registration_settings (
  id boolean primary key default true check (id),
  mode text not null default 'promo' check (mode in ('free', 'promo')),
  revision bigint not null default 1
);
insert into private.registration_settings(id) values(true);
create table private.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{4,64}$'),
  max_activations integer check (max_activations between 1 and 1000000),
  activations bigint not null default 0 check (activations >= 0),
  enabled boolean not null default true,
  revision bigint not null default 1,
  created_at timestamptz not null default now()
);
create table private.promo_registrations (
  id uuid primary key default gen_random_uuid(),
  promo_id uuid not null references private.promo_codes(id),
  -- Deleting an account preserves the historical count, but removes its identity.
  user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index promo_registrations_code on private.promo_registrations(promo_id);
alter table private.registration_settings enable row level security;
alter table private.promo_codes enable row level security;
alter table private.promo_registrations enable row level security;
revoke all on private.registration_settings, private.promo_codes, private.promo_registrations from public, anon, authenticated;

-- The only public information is the mode and validity of one supplied code, never a code list/count.
create function public.registration_check(p_code text default '') returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('mode', s.mode, 'valid', s.mode = 'free' or exists (
    select 1 from private.promo_codes p where p.code = upper(btrim(left(p_code, 65)))
      and p.enabled and (p.max_activations is null or p.activations < p.max_activations)
  )) from private.registration_settings s where s.id;
$$;
revoke all on function public.registration_check(text) from public;
grant execute on function public.registration_check(text) to anon, authenticated;

-- Optional Before User Created hook provides a readable Auth error. The trigger below remains
-- authoritative, so forgetting to configure the hook cannot open registration or exceed quotas.
create function public.registration_before_user_created(event jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not (public.registration_check(event->'user'->'user_metadata'->>'registration_promo_code')->>'valid')::boolean then
    return jsonb_build_object('error', jsonb_build_object('http_code', 400, 'message', 'promo_code_inactive'));
  end if;
  return '{}'::jsonb;
end;
$$;
revoke all on function public.registration_before_user_created(jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.registration_before_user_created(jsonb) to supabase_auth_admin;

create function private.record_promo_registration() returns trigger
language plpgsql security definer set search_path = '' as $$
declare registration_mode text; redeemed uuid;
begin
  -- Share lock serializes mode changes against registrations without serializing different codes.
  select mode into registration_mode from private.registration_settings where id for share;
  if registration_mode is null then raise exception 'registration_unavailable'; end if;
  if registration_mode = 'promo' then
    -- UPDATE locks/rechecks the row: simultaneous attempts cannot consume the same last activation.
    update private.promo_codes set activations = activations + 1
      where code = upper(btrim(left(new.raw_user_meta_data->>'registration_promo_code', 65)))
        and enabled and (max_activations is null or activations < max_activations)
      returning id into redeemed;
    if redeemed is null then raise exception 'promo_code_inactive'; end if;
    insert into private.promo_registrations(promo_id, user_id) values(redeemed, new.id);
  end if;
  -- The immutable association above is authoritative, not user-editable Auth metadata.
  update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) - 'registration_promo_code' where id = new.id;
  return new;
end;
$$;
revoke all on function private.record_promo_registration() from public, anon, authenticated;
create trigger jobsearch_registration after insert on auth.users
  for each row execute function private.record_promo_registration();

create function public.registration_admin_state(p_actor uuid, p_page integer default 1) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if not exists(select 1 from public.app_admins where user_id = p_actor) then raise exception 'admin_required'; end if;
  if p_page is null or p_page < 1 or p_page > 10000 then raise exception 'invalid_input'; end if;
  select jsonb_build_object('mode', mode, 'revision', revision, 'page', p_page,
    'hasMore', (select count(*) > p_page * 50 from private.promo_codes),
    'codes', coalesce((select jsonb_agg(to_jsonb(c)) from (
      select id, code, max_activations as "maxActivations", activations, enabled, revision, created_at as "createdAt"
      from private.promo_codes order by created_at desc, id desc limit 50 offset (p_page - 1) * 50
    ) c), '[]'::jsonb)) into result from private.registration_settings where id;
  return result;
end;
$$;
create function public.registration_set_mode(p_actor uuid, p_mode text, p_revision bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.app_admins where user_id = p_actor) then raise exception 'admin_required'; end if;
  if p_mode is null or p_mode not in ('free', 'promo') then raise exception 'invalid_input'; end if;
  update private.registration_settings set mode = p_mode, revision = revision + 1 where id and revision = p_revision;
  if not found then raise exception 'registration_conflict'; end if;
end;
$$;
create function public.registration_create_code(p_actor uuid, p_code text, p_max integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.app_admins where user_id = p_actor) then raise exception 'admin_required'; end if;
  if p_code is null or upper(btrim(p_code)) !~ '^[A-Z0-9_-]{4,64}$' or (p_max is not null and (p_max < 1 or p_max > 1000000)) then
    raise exception 'invalid_input';
  end if;
  insert into private.promo_codes(code, max_activations) values(upper(btrim(p_code)), p_max);
exception when unique_violation then raise exception 'promo_code_exists';
end;
$$;
create function public.registration_toggle_code(p_actor uuid, p_id uuid, p_enabled boolean, p_revision bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.app_admins where user_id = p_actor) then raise exception 'admin_required'; end if;
  if p_enabled is null then raise exception 'invalid_input'; end if;
  update private.promo_codes set enabled = p_enabled, revision = revision + 1 where id = p_id and revision = p_revision;
  if not found then raise exception 'registration_conflict'; end if;
end;
$$;
-- List-user provenance stays private and cannot be forged by editing the profile or Auth metadata.
create function public.registration_user_codes(p_actor uuid, p_users uuid[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.app_admins where user_id = p_actor) then raise exception 'admin_required'; end if;
  if cardinality(p_users) > 50 then raise exception 'invalid_input'; end if;
  return coalesce((select jsonb_object_agg(r.user_id::text, p.code) from private.promo_registrations r
    join private.promo_codes p on p.id = r.promo_id where r.user_id = any(p_users)), '{}'::jsonb);
end;
$$;
revoke all on function public.registration_admin_state(uuid, integer), public.registration_set_mode(uuid, text, bigint),
  public.registration_create_code(uuid, text, integer), public.registration_toggle_code(uuid, uuid, boolean, bigint),
  public.registration_user_codes(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.registration_admin_state(uuid, integer), public.registration_set_mode(uuid, text, bigint),
  public.registration_create_code(uuid, text, integer), public.registration_toggle_code(uuid, uuid, boolean, bigint),
  public.registration_user_codes(uuid, uuid[]) to service_role;

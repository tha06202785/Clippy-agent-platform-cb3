-- Private, email-bound pilot invitations with atomic workspace activation.

create table if not exists public.pilot_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  org_id uuid unique references public.orgs(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid references auth.users(id) on delete set null,
  revoked_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  trial_ends_at timestamptz,
  revoked_at timestamptz,
  last_sent_at timestamptz not null default now(),
  send_count smallint not null default 1 check (send_count > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pilot_invites_normalized_email_check
    check (email = lower(btrim(email)) and char_length(email) between 3 and 320),
  constraint pilot_invites_expiry_check check (expires_at > created_at),
  constraint pilot_invites_acceptance_check check (
    (status = 'accepted' and accepted_at is not null and trial_ends_at is not null and org_id is not null)
    or status <> 'accepted'
  )
);

create unique index if not exists pilot_invites_active_email_idx
  on public.pilot_invites (lower(email))
  where status in ('pending', 'accepted');

create index if not exists pilot_invites_status_expiry_idx
  on public.pilot_invites (status, expires_at);

create index if not exists pilot_invites_trial_expiry_idx
  on public.pilot_invites (trial_ends_at)
  where status = 'accepted';

create index if not exists pilot_invites_invited_by_idx
  on public.pilot_invites (invited_by);

create index if not exists pilot_invites_revoked_by_idx
  on public.pilot_invites (revoked_by);

create or replace function public.enforce_pilot_active_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_active_count integer;
begin
  if not (
    (new.status = 'pending' and new.expires_at > now())
    or (new.status = 'accepted' and new.trial_ends_at > now())
  ) then
    return new;
  end if;

  -- Serialize pilot reservations so simultaneous admin requests cannot exceed the cap.
  perform pg_advisory_xact_lock(hashtext('clippy_pilot_active_limit'));

  select count(*)
    into v_active_count
  from public.pilot_invites
  where id <> new.id
    and (
      (status = 'pending' and expires_at > now())
      or (status = 'accepted' and trial_ends_at > now())
    );

  if v_active_count >= 5 then
    raise exception 'pilot_active_limit_reached';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_pilot_active_limit() from public, anon, authenticated;

drop trigger if exists pilot_invites_active_limit_trigger on public.pilot_invites;
create trigger pilot_invites_active_limit_trigger
before insert or update of status, expires_at, trial_ends_at on public.pilot_invites
for each row execute function public.enforce_pilot_active_limit();

alter table public.pilot_invites enable row level security;
revoke all on table public.pilot_invites from anon, authenticated;
grant all on table public.pilot_invites to service_role;

create or replace function public.activate_pilot_invite(
  p_invite_id uuid,
  p_user_id uuid
)
returns table (pilot_org_id uuid, pilot_trial_ends_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invite public.pilot_invites%rowtype;
  v_user_email text;
  v_plan_id uuid;
  v_org_id uuid;
  v_trial_ends_at timestamptz;
  v_org_name text;
begin
  select lower(btrim(email))
    into v_user_email
  from auth.users
  where id = p_user_id;

  select *
    into v_invite
  from public.pilot_invites
  where id = p_invite_id
  for update;

  if not found or v_user_email is null then
    raise exception 'pilot_invite_invalid';
  end if;

  if v_invite.status = 'accepted'
    and v_invite.auth_user_id = p_user_id
    and v_invite.org_id is not null
    and v_invite.trial_ends_at > now() then
    return query select v_invite.org_id, v_invite.trial_ends_at;
    return;
  end if;

  if v_invite.status <> 'pending'
    or v_invite.auth_user_id <> p_user_id
    or lower(v_invite.email) <> v_user_email then
    raise exception 'pilot_invite_invalid';
  end if;

  if v_invite.expires_at <= now() then
    raise exception 'pilot_invite_expired';
  end if;

  if exists (
    select 1 from public.user_org_roles where user_id = p_user_id
  ) then
    raise exception 'pilot_user_already_has_workspace';
  end if;

  select id
    into v_plan_id
  from public.plans
  where key = 'starter' and is_active = true
  limit 1;

  if v_plan_id is null then
    raise exception 'pilot_plan_unavailable';
  end if;

  v_trial_ends_at := now() + interval '14 days';
  v_org_name := initcap(replace(split_part(v_invite.email, '@', 1), '.', ' ')) || '''s Pilot';

  insert into public.orgs (
    name,
    plan,
    market_code,
    timezone,
    settings_json
  ) values (
    v_org_name,
    'starter',
    'AU',
    'Australia/Melbourne',
    jsonb_build_object('pilot', true, 'pilot_invite_id', v_invite.id)
  )
  returning id into v_org_id;

  insert into public.user_org_roles (user_id, org_id, role)
  values (p_user_id, v_org_id::text, 'owner');

  insert into public.org_subscriptions (
    org_id,
    plan_id,
    status,
    trial_ends_at,
    current_period_start,
    current_period_end
  ) values (
    v_org_id,
    v_plan_id,
    'trialing',
    v_trial_ends_at,
    now(),
    v_trial_ends_at
  );

  update public.pilot_invites
    set status = 'accepted',
        org_id = v_org_id,
        accepted_at = now(),
        trial_ends_at = v_trial_ends_at,
        updated_at = now()
  where id = v_invite.id;

  return query select v_org_id, v_trial_ends_at;
end;
$$;

revoke all on function public.activate_pilot_invite(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.activate_pilot_invite(uuid, uuid)
  to service_role;

create or replace function public.extend_pilot_invite(
  p_invite_id uuid,
  p_days integer,
  p_actor_id uuid
)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invite public.pilot_invites%rowtype;
  v_trial_ends_at timestamptz;
begin
  if p_days < 1 or p_days > 30 then
    raise exception 'pilot_extension_invalid';
  end if;

  select * into v_invite
  from public.pilot_invites
  where id = p_invite_id
  for update;

  if not found or v_invite.status not in ('accepted', 'expired')
    or v_invite.org_id is null or v_invite.auth_user_id is null then
    raise exception 'pilot_invite_not_extendable';
  end if;

  v_trial_ends_at := greatest(coalesce(v_invite.trial_ends_at, now()), now())
    + make_interval(days => p_days);

  update public.pilot_invites
    set status = 'accepted',
        trial_ends_at = v_trial_ends_at,
        updated_at = now()
  where id = v_invite.id;

  insert into public.user_org_roles (user_id, org_id, role)
  values (v_invite.auth_user_id, v_invite.org_id::text, 'owner')
  on conflict (user_id, org_id) do update set role = excluded.role;

  update public.org_subscriptions
    set status = 'trialing',
        trial_ends_at = v_trial_ends_at,
        current_period_end = v_trial_ends_at,
        updated_at = now()
  where org_id = v_invite.org_id;

  return v_trial_ends_at;
end;
$$;

revoke all on function public.extend_pilot_invite(uuid, integer, uuid)
  from public, anon, authenticated;
grant execute on function public.extend_pilot_invite(uuid, integer, uuid)
  to service_role;

create or replace function public.revoke_pilot_invite(
  p_invite_id uuid,
  p_actor_id uuid
)
returns table (previous_status text, pilot_auth_user_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invite public.pilot_invites%rowtype;
begin
  select * into v_invite
  from public.pilot_invites
  where id = p_invite_id
  for update;

  if not found or v_invite.status not in ('pending', 'accepted') then
    raise exception 'pilot_invite_not_revocable';
  end if;

  if v_invite.org_id is not null then
    update public.org_subscriptions
      set status = 'canceled',
          cancel_at_period_end = false,
          current_period_end = now(),
          updated_at = now()
    where org_id = v_invite.org_id;

    if v_invite.auth_user_id is not null then
      delete from public.user_org_roles
      where org_id = v_invite.org_id::text
        and user_id = v_invite.auth_user_id;
    end if;
  end if;

  update public.pilot_invites
    set status = 'revoked',
        revoked_at = now(),
        revoked_by = p_actor_id,
        updated_at = now()
  where id = v_invite.id;

  return query select v_invite.status, v_invite.auth_user_id;
end;
$$;

revoke all on function public.revoke_pilot_invite(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.revoke_pilot_invite(uuid, uuid)
  to service_role;

create or replace function public.expire_pilot_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invite public.pilot_invites%rowtype;
begin
  select * into v_invite
  from public.pilot_invites
  where id = p_invite_id
  for update;

  if not found then
    raise exception 'pilot_invite_invalid';
  end if;
  if v_invite.status = 'expired' then
    return;
  end if;
  if v_invite.status <> 'accepted' or v_invite.trial_ends_at > now() then
    raise exception 'pilot_invite_not_expired';
  end if;

  update public.org_subscriptions
    set status = 'canceled',
        cancel_at_period_end = false,
        current_period_end = now(),
        updated_at = now()
  where org_id = v_invite.org_id;

  delete from public.user_org_roles
  where org_id = v_invite.org_id::text
    and user_id = v_invite.auth_user_id;

  update public.pilot_invites
    set status = 'expired', updated_at = now()
  where id = v_invite.id;
end;
$$;

revoke all on function public.expire_pilot_invite(uuid)
  from public, anon, authenticated;
grant execute on function public.expire_pilot_invite(uuid)
  to service_role;

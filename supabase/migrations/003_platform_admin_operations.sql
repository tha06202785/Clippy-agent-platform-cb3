-- Platform Command Centre write operations and immutable audit history.

alter table public.orgs
  add column if not exists platform_status text not null default 'active',
  add column if not exists platform_suspended_at timestamptz,
  add column if not exists platform_suspended_by uuid,
  add column if not exists platform_suspension_reason text;

alter table public.orgs
  drop constraint if exists orgs_platform_status_check;

alter table public.orgs
  add constraint orgs_platform_status_check
  check (platform_status in ('active', 'suspended'));

create table if not exists public.platform_admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  actor_email text,
  action text not null,
  target_org_id uuid references public.orgs(id) on delete set null,
  target_type text not null,
  target_id text,
  reason text not null,
  outcome text not null default 'started'
    check (outcome in ('started', 'completed', 'failed')),
  before_state jsonb,
  after_state jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists platform_admin_audit_org_created_idx
  on public.platform_admin_audit_log(target_org_id, created_at desc);
create index if not exists platform_admin_audit_actor_created_idx
  on public.platform_admin_audit_log(actor_user_id, created_at desc);

alter table public.platform_admin_audit_log enable row level security;

revoke all on table public.platform_admin_audit_log from public, anon, authenticated;
grant select, insert, update on table public.platform_admin_audit_log to service_role;

-- Suspension fields are controlled by the server-side platform administrator API.
revoke update (
  platform_status,
  platform_suspended_at,
  platform_suspended_by,
  platform_suspension_reason
) on table public.orgs from authenticated;

create or replace function public.protect_platform_org_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin')
    and (
      new.platform_status is distinct from old.platform_status
      or new.platform_suspended_at is distinct from old.platform_suspended_at
      or new.platform_suspended_by is distinct from old.platform_suspended_by
      or new.platform_suspension_reason is distinct from old.platform_suspension_reason
    )
  then
    raise exception 'Platform suspension fields are server managed';
  end if;
  return new;
end;
$$;

revoke execute on function public.protect_platform_org_fields()
  from public, anon, authenticated;

drop trigger if exists protect_platform_org_fields_trigger on public.orgs;
create trigger protect_platform_org_fields_trigger
before update on public.orgs
for each row execute function public.protect_platform_org_fields();

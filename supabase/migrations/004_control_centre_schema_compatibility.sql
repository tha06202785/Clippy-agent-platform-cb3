-- Align the production database with the billing and monitoring APIs.

alter table public.integrations
  add column if not exists last_sync_at timestamptz,
  add column if not exists items_indexed integer not null default 0,
  add column if not exists activity_summary jsonb not null default '{}'::jsonb,
  add column if not exists last_error text;

alter table public.scheduled_communications
  add column if not exists sent_at timestamptz;

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  monthly_price_cents integer not null default 0,
  currency text not null default 'AUD',
  included_credits integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.plans (key, name, monthly_price_cents, included_credits)
values
  ('free', 'Free', 0, 0),
  ('starter', 'Starter', 9900, 1000),
  ('professional', 'Professional', 19900, 5000),
  ('agency', 'Agency', 39900, 20000)
on conflict (key) do update set
  name = excluded.name,
  monthly_price_cents = excluded.monthly_price_cents,
  included_credits = excluded.included_credits,
  updated_at = now();

create table if not exists public.org_subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references public.orgs(id) on delete cascade,
  plan_id uuid references public.plans(id),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null default 'inactive',
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.org_subscriptions (
  org_id,
  plan_id,
  stripe_customer_id,
  stripe_subscription_id,
  status,
  current_period_start,
  current_period_end
)
select
  legacy.org_id,
  plan.id,
  legacy.stripe_customer_id,
  legacy.stripe_sub_id,
  coalesce(legacy.status, 'inactive'),
  legacy.start_at,
  legacy.renewal_at
from public.subscriptions legacy
left join public.plans plan on plan.key = coalesce(legacy.plan, 'free')
on conflict (org_id) do nothing;

create table if not exists public.system_incidents (
  id uuid primary key default gen_random_uuid(),
  severity text not null default 'p3',
  component text not null,
  title text not null,
  description text,
  status text not null default 'open',
  org_id uuid references public.orgs(id) on delete set null,
  error_fingerprint text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  occurrence_count integer not null default 1,
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists org_subscriptions_status_idx
  on public.org_subscriptions(status);
create index if not exists system_incidents_status_seen_idx
  on public.system_incidents(status, last_seen_at desc);

alter table public.plans enable row level security;
alter table public.org_subscriptions enable row level security;
alter table public.system_incidents enable row level security;

revoke all on table public.plans from public, anon, authenticated;
grant select on table public.plans to anon, authenticated;
grant all on table public.plans to service_role;

revoke all on table public.org_subscriptions from public, anon, authenticated;
grant select on table public.org_subscriptions to authenticated;
grant all on table public.org_subscriptions to service_role;

drop policy if exists "Organisation members read subscriptions"
  on public.org_subscriptions;
create policy "Organisation members read subscriptions"
on public.org_subscriptions
for select
to authenticated
using (
  exists (
    select 1
    from public.user_org_roles membership
    where membership.user_id = (select auth.uid())
      and membership.org_id = org_subscriptions.org_id::text
  )
);

revoke all on table public.system_incidents from public, anon, authenticated;
grant all on table public.system_incidents to service_role;

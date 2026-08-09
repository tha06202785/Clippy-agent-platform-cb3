-- Clippy Control Centre
-- Subscription, entitlements, AI usage, cost control, monitoring and support
-- Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists plans (
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

create table if not exists features (
  key text primary key,
  name text not null,
  description text,
  unit text not null default 'boolean',
  created_at timestamptz not null default now()
);

create table if not exists plan_features (
  plan_id uuid not null references plans(id) on delete cascade,
  feature_key text not null references features(key) on delete cascade,
  enabled boolean not null default true,
  monthly_limit integer,
  primary key (plan_id, feature_key)
);

create table if not exists org_subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique,
  plan_id uuid references plans(id),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null default 'trialing',
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists org_entitlement_overrides (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  feature_key text not null references features(key) on delete cascade,
  enabled boolean,
  monthly_limit integer,
  reason text,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (org_id, feature_key)
);

create table if not exists ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique,
  org_id uuid not null,
  user_id uuid,
  feature_key text not null,
  provider text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cached_tokens integer not null default 0,
  credits_used integer not null default 0,
  cost_micros bigint not null default 0,
  latency_ms integer,
  status text not null default 'success',
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists org_usage_balances (
  org_id uuid not null,
  period_start date not null,
  period_end date not null,
  credits_included integer not null default 0,
  credits_bonus integer not null default 0,
  credits_used integer not null default 0,
  cost_micros bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (org_id, period_start)
);

create table if not exists system_incidents (
  id uuid primary key default gen_random_uuid(),
  severity text not null default 'p3',
  component text not null,
  title text not null,
  description text,
  status text not null default 'open',
  org_id uuid,
  error_fingerprint text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  occurrence_count integer not null default 1,
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists system_heartbeats (
  key text primary key,
  status text not null default 'healthy',
  last_seen_at timestamptz not null default now(),
  latency_ms integer,
  message text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  user_id uuid,
  priority text not null default 'p3',
  category text not null default 'technical',
  subject text not null,
  description text not null,
  status text not null default 'open',
  page_url text,
  request_id text,
  diagnostics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_org_period on ai_usage_events(org_id, created_at desc);
create index if not exists idx_ai_usage_feature on ai_usage_events(feature_key, created_at desc);
create index if not exists idx_incidents_status on system_incidents(status, severity, last_seen_at desc);
create index if not exists idx_support_org on support_tickets(org_id, created_at desc);

insert into plans (key, name, monthly_price_cents, included_credits)
values
  ('starter', 'Starter', 9900, 1000),
  ('professional', 'Professional', 19900, 5000),
  ('agency', 'Agency', 39900, 20000)
on conflict (key) do update set
  name = excluded.name,
  monthly_price_cents = excluded.monthly_price_cents,
  included_credits = excluded.included_credits,
  updated_at = now();

insert into features (key, name, description, unit)
values
  ('copilot_chat', 'AI Copilot', 'Ask Clippy and generate contextual responses', 'credits'),
  ('knowledge_search', 'Knowledge search', 'Search agency and agent knowledge', 'requests'),
  ('knowledge_upload', 'Knowledge upload', 'Add documents and manual knowledge', 'documents'),
  ('facebook_messenger', 'Facebook Messenger', 'Receive and reply to Messenger leads', 'boolean'),
  ('instagram_dm', 'Instagram DMs', 'Receive and reply to Instagram leads', 'boolean'),
  ('whatsapp', 'WhatsApp', 'Receive and send WhatsApp messages', 'boolean'),
  ('email_automation', 'Email automation', 'Read, draft and send emails', 'messages'),
  ('inspection_booking', 'Inspection booking', 'Automated inspection scheduling', 'bookings'),
  ('advanced_analytics', 'Advanced analytics', 'Agency performance and margin analytics', 'boolean'),
  ('team_management', 'Team management', 'Invite and manage agency users', 'users')
on conflict (key) do nothing;

with p as (select id, key from plans)
insert into plan_features (plan_id, feature_key, enabled, monthly_limit)
select p.id, f.feature_key, f.enabled, f.monthly_limit
from p
join (values
  ('starter','copilot_chat',true,1000),
  ('starter','knowledge_search',true,500),
  ('starter','knowledge_upload',true,25),
  ('starter','team_management',true,1),
  ('professional','copilot_chat',true,5000),
  ('professional','knowledge_search',true,5000),
  ('professional','knowledge_upload',true,250),
  ('professional','facebook_messenger',true,null),
  ('professional','instagram_dm',true,null),
  ('professional','whatsapp',true,null),
  ('professional','email_automation',true,2000),
  ('professional','inspection_booking',true,1000),
  ('professional','team_management',true,3),
  ('agency','copilot_chat',true,20000),
  ('agency','knowledge_search',true,25000),
  ('agency','knowledge_upload',true,2000),
  ('agency','facebook_messenger',true,null),
  ('agency','instagram_dm',true,null),
  ('agency','whatsapp',true,null),
  ('agency','email_automation',true,10000),
  ('agency','inspection_booking',true,10000),
  ('agency','advanced_analytics',true,null),
  ('agency','team_management',true,15)
) as f(plan_key, feature_key, enabled, monthly_limit) on f.plan_key = p.key
on conflict (plan_id, feature_key) do update set
  enabled = excluded.enabled,
  monthly_limit = excluded.monthly_limit;

alter table plans enable row level security;
alter table features enable row level security;
alter table plan_features enable row level security;
alter table org_subscriptions enable row level security;
alter table org_entitlement_overrides enable row level security;
alter table ai_usage_events enable row level security;
alter table org_usage_balances enable row level security;
alter table system_incidents enable row level security;
alter table system_heartbeats enable row level security;
alter table support_tickets enable row level security;

-- Members can read their own organisation's commercial state and usage.
do $$ begin
  create policy "org members read subscription" on org_subscriptions for select
    using (org_id in (select org_id from user_org_roles where user_id = auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "org members read usage" on ai_usage_events for select
    using (org_id in (select org_id from user_org_roles where user_id = auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "org members read balances" on org_usage_balances for select
    using (org_id in (select org_id from user_org_roles where user_id = auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "org members create support tickets" on support_tickets for insert
    with check (org_id in (select org_id from user_org_roles where user_id = auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "org members read support tickets" on support_tickets for select
    using (org_id in (select org_id from user_org_roles where user_id = auth.uid()));
exception when duplicate_object then null; end $$;

-- Atomic usage roll-up. Service-role calls bypass RLS.
create or replace function record_ai_usage(
  p_request_id text,
  p_org_id uuid,
  p_user_id uuid,
  p_feature_key text,
  p_provider text,
  p_model text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_cached_tokens integer,
  p_credits_used integer,
  p_cost_micros bigint,
  p_latency_ms integer,
  p_status text,
  p_error_code text default null,
  p_metadata jsonb default '{}'::jsonb
) returns void language plpgsql security definer as $$
declare
  v_start date := date_trunc('month', now())::date;
  v_end date := (date_trunc('month', now()) + interval '1 month - 1 day')::date;
begin
  insert into ai_usage_events (
    request_id, org_id, user_id, feature_key, provider, model,
    input_tokens, output_tokens, cached_tokens, credits_used,
    cost_micros, latency_ms, status, error_code, metadata
  ) values (
    p_request_id, p_org_id, p_user_id, p_feature_key, p_provider, p_model,
    greatest(p_input_tokens,0), greatest(p_output_tokens,0), greatest(p_cached_tokens,0),
    greatest(p_credits_used,0), greatest(p_cost_micros,0), p_latency_ms,
    p_status, p_error_code, coalesce(p_metadata,'{}'::jsonb)
  ) on conflict (request_id) do nothing;

  insert into org_usage_balances (org_id, period_start, period_end, credits_used, cost_micros)
  values (p_org_id, v_start, v_end, greatest(p_credits_used,0), greatest(p_cost_micros,0))
  on conflict (org_id, period_start) do update set
    credits_used = org_usage_balances.credits_used + excluded.credits_used,
    cost_micros = org_usage_balances.cost_micros + excluded.cost_micros,
    updated_at = now();
end;
$$;
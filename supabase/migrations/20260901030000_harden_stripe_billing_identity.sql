-- Bind every Stripe customer to a real organisation billing contact and keep
-- webhook processing idempotent and auditable.

alter table public.org_subscriptions
  add column if not exists billing_contact_user_id uuid
    references auth.users(id) on delete set null,
  add column if not exists billing_contact_email text,
  add column if not exists billing_contact_name text,
  add column if not exists billing_contact_phone_last4 text,
  add column if not exists billing_identity_status text not null
    default 'unverified',
  add column if not exists billing_identity_verified_at timestamptz,
  add column if not exists checkout_started_at timestamptz;

alter table public.org_subscriptions
  drop constraint if exists org_subscriptions_billing_identity_status_check;

alter table public.org_subscriptions
  add constraint org_subscriptions_billing_identity_status_check
  check (
    billing_identity_status in (
      'unverified',
      'pending',
      'verified',
      'requires_review'
    )
  );

alter table public.org_subscriptions
  drop constraint if exists org_subscriptions_billing_contact_email_check;

alter table public.org_subscriptions
  add constraint org_subscriptions_billing_contact_email_check
  check (
    billing_contact_email is null
    or (
      billing_contact_email = lower(btrim(billing_contact_email))
      and char_length(billing_contact_email) between 3 and 320
    )
  );

alter table public.org_subscriptions
  drop constraint if exists org_subscriptions_billing_contact_phone_last4_check;

alter table public.org_subscriptions
  add constraint org_subscriptions_billing_contact_phone_last4_check
  check (
    billing_contact_phone_last4 is null
    or billing_contact_phone_last4 ~ '^[0-9]{4}$'
  );

create unique index if not exists org_subscriptions_stripe_customer_key
  on public.org_subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists org_subscriptions_billing_contact_idx
  on public.org_subscriptions (billing_contact_user_id)
  where billing_contact_user_id is not null;

-- Legacy Stripe rows are deliberately not auto-trusted. Rows without a
-- current owner/admin are isolated for manual reconciliation.
update public.org_subscriptions subscription
set billing_identity_status = case
  when subscription.stripe_customer_id is null then 'unverified'
  when exists (
    select 1
    from public.user_org_roles membership
    where membership.org_id = subscription.org_id::text
      and membership.role in ('owner', 'admin')
  ) then 'unverified'
  else 'requires_review'
end
where subscription.billing_identity_status = 'unverified';

create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  stripe_object_id text,
  livemode boolean not null default false,
  status text not null default 'processing'
    check (status in ('processing', 'processed', 'failed')),
  attempt_count integer not null default 1 check (attempt_count > 0),
  processing_result text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists stripe_webhook_events_status_created_idx
  on public.stripe_webhook_events (status, created_at desc);

create table if not exists public.billing_audit_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  outcome text not null check (outcome in ('success', 'blocked', 'failed')),
  stripe_event_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists billing_audit_events_org_created_idx
  on public.billing_audit_events (org_id, created_at desc);

create index if not exists billing_audit_events_stripe_event_idx
  on public.billing_audit_events (stripe_event_id)
  where stripe_event_id is not null;

alter table public.stripe_webhook_events enable row level security;
alter table public.billing_audit_events enable row level security;

-- Billing identifiers, contact snapshots, webhook state and audit records are
-- server-only. Application routes expose only the minimum safe projection.
drop policy if exists "org members read subscription"
  on public.org_subscriptions;
revoke all on table public.org_subscriptions from anon, authenticated;
revoke all on table public.stripe_webhook_events from anon, authenticated;
revoke all on table public.billing_audit_events from anon, authenticated;

grant all on table public.org_subscriptions to service_role;
grant all on table public.stripe_webhook_events to service_role;
grant all on table public.billing_audit_events to service_role;

-- Multi-account email/calendar connections and durable webhook replay.
-- Existing single-provider integration rows remain as compatibility rollups.

create table if not exists public.integration_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  connected_by_user_id uuid references auth.users(id) on delete set null,
  provider text not null,
  external_account_id text not null,
  email text,
  display_name text,
  status text not null default 'connected'
    check (status in ('connected', 'warning', 'error', 'disconnected')),
  access_scope text not null default 'personal'
    check (access_scope in ('personal', 'agency')),
  is_primary boolean not null default false,
  credentials_encrypted text not null,
  scopes text[] not null default '{}',
  settings_json jsonb not null default '{}'::jsonb,
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_accounts_org_provider_external_key
    unique (org_id, provider, external_account_id)
);

create unique index if not exists integration_accounts_one_primary_key
  on public.integration_accounts (org_id, provider)
  where is_primary and status <> 'disconnected';

create index if not exists integration_accounts_org_status_idx
  on public.integration_accounts (org_id, status, provider);

create index if not exists integration_accounts_connected_by_idx
  on public.integration_accounts (connected_by_user_id)
  where connected_by_user_id is not null;

create table if not exists public.integration_resources (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  integration_account_id uuid not null
    references public.integration_accounts(id) on delete cascade,
  resource_type text not null
    check (resource_type in ('mail', 'calendar')),
  external_resource_id text not null default 'primary',
  display_name text,
  status text not null default 'connected'
    check (status in ('connected', 'warning', 'error', 'disabled')),
  sync_enabled boolean not null default true,
  send_enabled boolean not null default true,
  learning_enabled boolean not null default false,
  sync_cursor jsonb not null default '{}'::jsonb,
  settings_json jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  next_sync_at timestamptz,
  items_indexed integer not null default 0,
  errors_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_resources_account_type_external_key
    unique (integration_account_id, resource_type, external_resource_id)
);

create index if not exists integration_resources_org_type_status_idx
  on public.integration_resources (org_id, resource_type, status);

create index if not exists integration_resources_account_idx
  on public.integration_resources (integration_account_id);

-- Raw webhook events are server-only and retained for replay/debugging.
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs(id) on delete cascade,
  channel text not null,
  event_type text not null,
  raw_payload jsonb not null,
  headers jsonb,
  processed boolean not null default false,
  processing_result text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists webhook_events_org_channel_created_idx
  on public.webhook_events (org_id, channel, created_at desc);

create index if not exists webhook_events_unprocessed_idx
  on public.webhook_events (created_at)
  where not processed;

alter table public.conversations
  add column if not exists integration_account_id uuid;

alter table public.knowledge_documents
  add column if not exists integration_account_id uuid;

alter table public.communication_examples
  add column if not exists integration_account_id uuid;

alter table public.inspection_bookings
  add column if not exists calendar_integration_account_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'conversations_integration_account_id_fkey'
      and conrelid = 'public.conversations'::regclass
  ) then
    alter table public.conversations
      add constraint conversations_integration_account_id_fkey
      foreign key (integration_account_id)
      references public.integration_accounts(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'knowledge_documents_integration_account_id_fkey'
      and conrelid = 'public.knowledge_documents'::regclass
  ) then
    alter table public.knowledge_documents
      add constraint knowledge_documents_integration_account_id_fkey
      foreign key (integration_account_id)
      references public.integration_accounts(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'communication_examples_integration_account_id_fkey'
      and conrelid = 'public.communication_examples'::regclass
  ) then
    alter table public.communication_examples
      add constraint communication_examples_integration_account_id_fkey
      foreign key (integration_account_id)
      references public.integration_accounts(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'inspection_bookings_calendar_integration_account_id_fkey'
      and conrelid = 'public.inspection_bookings'::regclass
  ) then
    alter table public.inspection_bookings
      add constraint inspection_bookings_calendar_integration_account_id_fkey
      foreign key (calendar_integration_account_id)
      references public.integration_accounts(id) on delete set null;
  end if;
end $$;

create index if not exists conversations_org_account_channel_thread_idx
  on public.conversations
  (org_id, integration_account_id, channel, external_thread_id);

create index if not exists knowledge_documents_integration_account_idx
  on public.knowledge_documents (integration_account_id)
  where integration_account_id is not null;

create index if not exists communication_examples_integration_account_idx
  on public.communication_examples (integration_account_id)
  where integration_account_id is not null;

create index if not exists inspection_bookings_calendar_account_idx
  on public.inspection_bookings (calendar_integration_account_id)
  where calendar_integration_account_id is not null;

-- Preserve the existing Gmail credentials as the primary Google account.
insert into public.integration_accounts (
  org_id,
  connected_by_user_id,
  provider,
  external_account_id,
  email,
  display_name,
  status,
  access_scope,
  is_primary,
  credentials_encrypted,
  scopes,
  settings_json,
  connected_at,
  last_sync_at,
  last_error,
  created_at,
  updated_at
)
select
  integration.org_id,
  (
    select membership.user_id
    from public.user_org_roles membership
    where membership.org_id = integration.org_id::text
    order by membership.created_at asc
    limit 1
  ),
  'google',
  coalesce(
    nullif(integration.settings_json ->> 'external_account_id', ''),
    'legacy:' || integration.id::text
  ),
  nullif(integration.settings_json ->> 'email', ''),
  nullif(integration.settings_json ->> 'display_name', ''),
  case
    when integration.status = 'connected' then 'connected'
    else 'warning'
  end,
  'personal',
  true,
  integration.credentials_encrypted,
  case
    when nullif(integration.settings_json ->> 'scope', '') is null then '{}'
    else regexp_split_to_array(integration.settings_json ->> 'scope', '\s+')
  end,
  jsonb_build_object('legacy_integration_id', integration.id),
  coalesce(integration.connected_at, integration.created_at, now()),
  integration.last_sync_at,
  integration.last_error,
  coalesce(integration.created_at, now()),
  coalesce(integration.updated_at, now())
from public.integrations integration
where integration.provider = 'gmail'
  and integration.credentials_encrypted is not null
on conflict (org_id, provider, external_account_id) do update set
  credentials_encrypted = excluded.credentials_encrypted,
  scopes = excluded.scopes,
  status = excluded.status,
  last_sync_at = excluded.last_sync_at,
  last_error = excluded.last_error,
  updated_at = excluded.updated_at;

insert into public.integration_resources (
  org_id,
  integration_account_id,
  resource_type,
  external_resource_id,
  display_name,
  status,
  sync_enabled,
  send_enabled,
  learning_enabled,
  last_sync_at,
  items_indexed,
  settings_json
)
select
  account.org_id,
  account.id,
  resource.resource_type,
  'primary',
  resource.display_name,
  account.status,
  true,
  true,
  resource.resource_type = 'mail',
  legacy.last_sync_at,
  coalesce(legacy.items_indexed, 0),
  jsonb_build_object('legacy_provider', resource.legacy_provider)
from public.integration_accounts account
cross join lateral (
  values
    ('mail'::text, 'Gmail'::text, 'gmail'::text),
    ('calendar'::text, 'Google Calendar'::text, 'google-calendar'::text)
) as resource(resource_type, display_name, legacy_provider)
left join public.integrations legacy
  on legacy.org_id = account.org_id
 and legacy.provider = resource.legacy_provider
where account.provider = 'google'
  and account.external_account_id like 'legacy:%'
on conflict (integration_account_id, resource_type, external_resource_id)
do update set
  status = excluded.status,
  last_sync_at = excluded.last_sync_at,
  items_indexed = excluded.items_indexed,
  updated_at = now();

update public.conversations conversation
set integration_account_id = account.id
from public.integration_accounts account
where conversation.integration_account_id is null
  and conversation.channel = 'email'
  and account.org_id::text = conversation.org_id
  and account.provider = 'google'
  and account.is_primary;

update public.knowledge_documents document
set integration_account_id = account.id
from public.integration_accounts account
where document.integration_account_id is null
  and document.source in ('email', 'calendar')
  and account.org_id = document.org_id
  and account.provider = 'google'
  and account.is_primary;

update public.communication_examples example
set integration_account_id = account.id
from public.integration_accounts account
where example.integration_account_id is null
  and example.channel = 'email'
  and account.org_id = example.org_id
  and account.provider = 'google'
  and account.is_primary;

update public.inspection_bookings booking
set calendar_integration_account_id = account.id
from public.integration_accounts account
where booking.calendar_integration_account_id is null
  and account.org_id::text = booking.org_id
  and account.provider = 'google'
  and account.is_primary;

alter table public.integration_accounts enable row level security;
alter table public.integration_resources enable row level security;
alter table public.webhook_events enable row level security;

-- OAuth credentials and raw webhook payloads are server-only. Authenticated
-- clients receive sanitised metadata through authenticated route handlers.
revoke all on table public.integration_accounts from anon, authenticated;
revoke all on table public.integration_resources from anon, authenticated;
revoke all on table public.webhook_events from anon, authenticated;
grant all on table public.integration_accounts to service_role;
grant all on table public.integration_resources to service_role;
grant all on table public.webhook_events to service_role;

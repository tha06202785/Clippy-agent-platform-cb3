-- Clippy Adaptive Intelligence: private agent voice examples, learning
-- controls, feedback events, and structured client communication preferences.

alter table public.agent_profiles
  add column if not exists style_summary text,
  add column if not exists style_rules jsonb not null default '{}'::jsonb,
  add column if not exists avoid_phrases jsonb not null default '[]'::jsonb,
  add column if not exists common_greetings jsonb not null default '[]'::jsonb,
  add column if not exists common_signoffs jsonb not null default '[]'::jsonb,
  add column if not exists average_message_words integer,
  add column if not exists learned_sample_count integer not null default 0,
  add column if not exists learning_version integer not null default 1,
  add column if not exists last_learned_at timestamptz;

alter table public.client_memories
  add column if not exists tone_preference text,
  add column if not exists length_preference text,
  add column if not exists language_preference text,
  add column if not exists reminder_preference text,
  add column if not exists communication_signals jsonb not null default '{}'::jsonb,
  add column if not exists preference_confidence integer not null default 0,
  add column if not exists preference_evidence_count integer not null default 0,
  add column if not exists last_preference_evidence_at timestamptz,
  add column if not exists locked_preferences jsonb not null default '{}'::jsonb,
  add column if not exists learning_excluded boolean not null default false;

create table if not exists public.communication_learning_settings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null,
  learning_enabled boolean not null default false,
  learn_from_sent boolean not null default false,
  learn_from_approved boolean not null default true,
  learn_from_corrections boolean not null default true,
  learn_client_preferences boolean not null default true,
  retain_raw_examples boolean not null default false,
  retention_days integer not null default 365
    check (retention_days between 30 and 3650),
  automation_level text not null default 'draft'
    check (automation_level in ('observe', 'assist', 'draft', 'trusted')),
  excluded_channels text[] not null default '{}'::text[],
  last_message_scan_at timestamptz,
  last_sent_sync_at timestamptz,
  sent_page_token text,
  sent_backfill_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create table if not exists public.communication_examples (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null,
  lead_id uuid references public.leads(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  source_message_id text,
  source text not null
    check (source in (
      'gmail_sent',
      'approved_draft',
      'agent_edit',
      'manual',
      'outbound_message'
    )),
  channel text not null default 'email',
  situation text not null default 'general',
  subject text,
  content text not null,
  content_hash text not null,
  embedding jsonb not null default '[]'::jsonb,
  embedding_model text not null default 'local:feature-hash-v1',
  quality_score numeric(5,4) not null default 0.7500
    check (quality_score between 0 and 1),
  approved boolean not null default true,
  excluded boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id, content_hash)
);

create table if not exists public.communication_learning_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null,
  lead_id uuid references public.leads(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  example_id uuid references public.communication_examples(id)
    on delete set null,
  event_type text not null
    check (event_type in (
      'approved',
      'edited',
      'rejected',
      'explicit_rule',
      'never_say',
      'profile_reset',
      'example_excluded',
      'client_preference_updated'
    )),
  feedback_code text,
  original_text text,
  final_text text,
  guidance_text text,
  applied_scope text not null default 'agent'
    check (applied_scope in ('agent', 'client', 'agency', 'situation')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists communication_learning_settings_org_user_idx
  on public.communication_learning_settings (org_id, user_id);

create index if not exists communication_examples_agent_recent_idx
  on public.communication_examples (org_id, user_id, occurred_at desc)
  where excluded = false and approved = true;

create index if not exists communication_examples_agent_situation_idx
  on public.communication_examples
    (org_id, user_id, situation, quality_score desc);

create index if not exists communication_examples_lead_idx
  on public.communication_examples (org_id, lead_id, occurred_at desc)
  where lead_id is not null;

create unique index if not exists communication_examples_source_message_idx
  on public.communication_examples
    (org_id, user_id, source, source_message_id)
  where source_message_id is not null;

create index if not exists communication_learning_events_agent_recent_idx
  on public.communication_learning_events (org_id, user_id, created_at desc);

create index if not exists communication_learning_events_lead_idx
  on public.communication_learning_events (org_id, lead_id, created_at desc)
  where lead_id is not null;

create index if not exists client_memories_org_preference_idx
  on public.client_memories (org_id, last_preference_evidence_at desc)
  where learning_excluded = false;

alter table public.communication_learning_settings enable row level security;
alter table public.communication_examples enable row level security;
alter table public.communication_learning_events enable row level security;

drop policy if exists "communication_learning_settings_own_manage"
  on public.communication_learning_settings;
create policy "communication_learning_settings_own_manage"
on public.communication_learning_settings
for all
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.user_org_roles membership
    where membership.user_id = (select auth.uid())
      and membership.org_id = communication_learning_settings.org_id::text
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.user_org_roles membership
    where membership.user_id = (select auth.uid())
      and membership.org_id = communication_learning_settings.org_id::text
  )
);

drop policy if exists "communication_examples_own_manage"
  on public.communication_examples;
create policy "communication_examples_own_manage"
on public.communication_examples
for all
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.user_org_roles membership
    where membership.user_id = (select auth.uid())
      and membership.org_id = communication_examples.org_id::text
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.user_org_roles membership
    where membership.user_id = (select auth.uid())
      and membership.org_id = communication_examples.org_id::text
  )
);

drop policy if exists "communication_learning_events_own_manage"
  on public.communication_learning_events;
create policy "communication_learning_events_own_manage"
on public.communication_learning_events
for all
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.user_org_roles membership
    where membership.user_id = (select auth.uid())
      and membership.org_id = communication_learning_events.org_id::text
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.user_org_roles membership
    where membership.user_id = (select auth.uid())
      and membership.org_id = communication_learning_events.org_id::text
  )
);

grant select, insert, update, delete
  on public.communication_learning_settings to authenticated;
grant select, insert, update, delete
  on public.communication_examples to authenticated;
grant select, insert, update, delete
  on public.communication_learning_events to authenticated;

-- The project owner explicitly enabled Adaptive Intelligence for the
-- currently connected Gmail workspace. New organisations remain opt-in.
insert into public.communication_learning_settings (
  org_id,
  user_id,
  learning_enabled,
  learn_from_sent,
  learn_from_approved,
  learn_from_corrections,
  learn_client_preferences
)
select
  gmail.org_id,
  owner_member.user_id,
  true,
  true,
  true,
  true,
  true
from public.integrations gmail
cross join lateral (
  select membership.user_id
  from public.user_org_roles membership
  where membership.org_id = gmail.org_id::text
  order by
    case membership.role
      when 'owner' then 0
      when 'admin' then 1
      else 2
    end,
    membership.created_at
  limit 1
) owner_member
where gmail.provider = 'gmail'
  and gmail.status = 'connected'
on conflict (org_id, user_id) do nothing;

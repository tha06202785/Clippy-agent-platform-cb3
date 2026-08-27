-- Agent-reviewed ten-section DNA blueprint. Inferred suggestions never become
-- active behavioural instructions until the owning agent confirms them.

create table if not exists public.agent_dna_sections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  section_key text not null check (section_key in (
    'identity',
    'voice',
    'content',
    'conversion',
    'decisions',
    'client_relationships',
    'operations',
    'idea_expansion',
    'audience_intelligence',
    'growth'
  )),
  summary text not null default '' check (char_length(summary) <= 1500),
  rules jsonb not null default '[]'::jsonb
    check (jsonb_typeof(rules) = 'array'),
  goals jsonb not null default '[]'::jsonb
    check (jsonb_typeof(goals) = 'array'),
  agent_notes text not null default '' check (char_length(agent_notes) <= 2000),
  source text not null default 'recommended'
    check (source in ('recommended', 'inferred', 'agent')),
  status text not null default 'needs_input'
    check (status in ('needs_input', 'draft', 'confirmed')),
  confidence integer not null default 0 check (confidence between 0 and 100),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  version integer not null default 1 check (version > 0),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id, section_key),
  constraint agent_dna_confirmation_check check (
    status <> 'confirmed' or confirmed_at is not null
  )
);

create index if not exists agent_dna_sections_user_status_idx
  on public.agent_dna_sections (user_id, status, section_key);

create index if not exists agent_dna_sections_org_confirmed_idx
  on public.agent_dna_sections (org_id, user_id, section_key)
  where status = 'confirmed';

alter table public.agent_dna_sections enable row level security;

drop policy if exists "agent_dna_sections_own_manage"
  on public.agent_dna_sections;
create policy "agent_dna_sections_own_manage"
on public.agent_dna_sections
for all
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.user_org_roles membership
    where membership.user_id = (select auth.uid())
      and membership.org_id = agent_dna_sections.org_id::text
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.user_org_roles membership
    where membership.user_id = (select auth.uid())
      and membership.org_id = agent_dna_sections.org_id::text
  )
);

revoke all on public.agent_dna_sections from anon, authenticated;
grant select, insert, update, delete on public.agent_dna_sections to authenticated;
grant all on public.agent_dna_sections to service_role;

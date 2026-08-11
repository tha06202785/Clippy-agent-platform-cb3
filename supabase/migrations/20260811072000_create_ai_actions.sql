create table if not exists public.ai_actions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  action_type text not null,
  input_summary text,
  output_summary text,
  confidence double precision,
  latency_ms integer,
  tokens_used integer,
  escalated boolean default false,
  escalation_reason text,
  created_at timestamptz not null default now()
);

create index if not exists ai_actions_org_created_idx
  on public.ai_actions(org_id, created_at desc);
create index if not exists ai_actions_conversation_idx
  on public.ai_actions(conversation_id)
  where conversation_id is not null;

alter table public.ai_actions enable row level security;

drop policy if exists "Tenant members read ai actions" on public.ai_actions;
create policy "Tenant members read ai actions"
  on public.ai_actions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_org_roles membership
      where membership.user_id = (select auth.uid())
        and membership.org_id = ai_actions.org_id::text
    )
  );

revoke all on public.ai_actions from anon;
grant select on public.ai_actions to authenticated;
grant all on public.ai_actions to service_role;

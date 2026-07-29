-- Add the fields already used by the Pipeline UI to the existing listings model.
alter table public.listings
  add column if not exists bedrooms integer,
  add column if not exists bathrooms integer,
  add column if not exists parking integer,
  add column if not exists property_type text,
  add column if not exists description text,
  add column if not exists stage text not null default 'inquiry';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'listings_stage_check'
      and conrelid = 'public.listings'::regclass
  ) then
    alter table public.listings
      add constraint listings_stage_check
      check (stage in (
        'inquiry', 'contacted', 'qualified', 'proposal',
        'negotiation', 'closed_won', 'closed_lost'
      ));
  end if;
end
$$;

create index if not exists listings_org_stage_idx
  on public.listings (org_id, stage, created_at desc);

-- Store detailed, tenant-scoped AI usage without exposing writes through PostgREST.
create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  org_id text not null,
  user_id uuid,
  feature_key text not null,
  provider text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cached_tokens integer not null default 0,
  credits_used numeric not null default 0,
  cost_micros bigint not null default 0,
  latency_ms integer,
  status text not null check (status in ('success', 'error', 'blocked')),
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ai_usage_events enable row level security;

revoke all on table public.ai_usage_events from anon, authenticated;
grant select on table public.ai_usage_events to authenticated;

drop policy if exists "Members read organisation AI usage" on public.ai_usage_events;
create policy "Members read organisation AI usage"
  on public.ai_usage_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_org_roles membership
      where membership.user_id = (select auth.uid())
        and membership.org_id = ai_usage_events.org_id
    )
  );

create index if not exists ai_usage_events_org_feature_created_idx
  on public.ai_usage_events (org_id, feature_key, created_at desc);

create or replace function public.record_ai_usage(
  p_request_id text,
  p_org_id text,
  p_user_id uuid,
  p_feature_key text,
  p_provider text,
  p_model text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_cached_tokens integer,
  p_credits_used numeric,
  p_cost_micros bigint,
  p_latency_ms integer,
  p_status text,
  p_error_code text,
  p_metadata jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_user_id uuid := auth.uid();
begin
  if caller_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_user_id is not null and p_user_id <> caller_user_id then
    raise exception 'Cannot record usage for another user';
  end if;

  if not exists (
    select 1
    from public.user_org_roles membership
    where membership.user_id = caller_user_id
      and membership.org_id = p_org_id
  ) then
    raise exception 'Organisation access denied';
  end if;

  insert into public.ai_usage_events (
    request_id, org_id, user_id, feature_key, provider, model,
    input_tokens, output_tokens, cached_tokens, credits_used,
    cost_micros, latency_ms, status, error_code, metadata
  )
  values (
    p_request_id, p_org_id, caller_user_id, p_feature_key, p_provider, p_model,
    greatest(coalesce(p_input_tokens, 0), 0),
    greatest(coalesce(p_output_tokens, 0), 0),
    greatest(coalesce(p_cached_tokens, 0), 0),
    greatest(coalesce(p_credits_used, 0), 0),
    greatest(coalesce(p_cost_micros, 0), 0),
    p_latency_ms, p_status, p_error_code, coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.record_ai_usage(
  text, text, uuid, text, text, text, integer, integer, integer,
  numeric, bigint, integer, text, text, jsonb
) from public, anon;

grant execute on function public.record_ai_usage(
  text, text, uuid, text, text, text, integer, integer, integer,
  numeric, bigint, integer, text, text, jsonb
) to authenticated, service_role;

-- AI usage and cost records are billing/operations data. They must only be
-- written by trusted server code using the service role, never directly by a
-- signed-in browser client.

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
begin
  if p_user_id is null then
    raise exception 'User ID is required';
  end if;

  if not exists (
    select 1
    from public.user_org_roles membership
    where membership.user_id = p_user_id
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
    p_request_id, p_org_id, p_user_id, p_feature_key, p_provider, p_model,
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
) from public, anon, authenticated;

grant execute on function public.record_ai_usage(
  text, text, uuid, text, text, text, integer, integer, integer,
  numeric, bigint, integer, text, text, jsonb
) to service_role;

comment on function public.record_ai_usage(
  text, text, uuid, text, text, text, integer, integer, integer,
  numeric, bigint, integer, text, text, jsonb
) is 'Server-only AI usage accounting. Execute is restricted to service_role.';

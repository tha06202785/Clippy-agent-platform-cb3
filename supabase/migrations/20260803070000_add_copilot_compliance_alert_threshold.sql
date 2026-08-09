create or replace function public.record_compliance_intervention_alert(
  p_org_id text,
  p_request_id text,
  p_checks text[],
  p_threshold integer default 3,
  p_window_minutes integer default 60
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org_uuid uuid;
  v_fingerprint text;
  v_recent_count integer;
  v_incident_id uuid;
begin
  if p_threshold < 2 or p_threshold > 100 then
    raise exception 'Compliance alert threshold must be between 2 and 100';
  end if;

  if p_window_minutes < 1 or p_window_minutes > 10080 then
    raise exception 'Compliance alert window must be between 1 and 10080 minutes';
  end if;

  v_org_uuid := p_org_id::uuid;
  v_fingerprint := 'copilot_compliance:' || p_org_id;

  -- Serialise alerts per organisation so concurrent Copilot requests cannot
  -- create duplicate open incidents.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_fingerprint, 0)
  );

  select count(*)::integer
  into v_recent_count
  from public.ai_usage_events
  where org_id = p_org_id
    and feature_key = 'copilot_chat'
    and error_code = 'compliance_review'
    and created_at >= pg_catalog.now() - pg_catalog.make_interval(mins => p_window_minutes);

  if v_recent_count < p_threshold then
    return pg_catalog.jsonb_build_object(
      'alerted', false,
      'recent_count', v_recent_count,
      'threshold', p_threshold
    );
  end if;

  select id
  into v_incident_id
  from public.system_incidents
  where error_fingerprint = v_fingerprint
    and status <> 'resolved'
  order by last_seen_at desc
  limit 1
  for update;

  if v_incident_id is null then
    insert into public.system_incidents (
      severity,
      component,
      title,
      description,
      status,
      org_id,
      error_fingerprint,
      occurrence_count,
      metadata
    ) values (
      'p3',
      'copilot_compliance',
      'Repeated Copilot compliance interventions',
      'Copilot repeatedly withheld generated responses for this agency. Review the issue categories and agency usage pattern.',
      'open',
      v_org_uuid,
      v_fingerprint,
      v_recent_count,
      pg_catalog.jsonb_build_object(
        'last_request_id', p_request_id,
        'last_checks', pg_catalog.to_jsonb(coalesce(p_checks, array[]::text[])),
        'threshold', p_threshold,
        'window_minutes', p_window_minutes,
        'recent_count', v_recent_count
      )
    )
    returning id into v_incident_id;
  else
    update public.system_incidents
    set last_seen_at = pg_catalog.now(),
        occurrence_count = occurrence_count + 1,
        metadata = coalesce(metadata, '{}'::jsonb) || pg_catalog.jsonb_build_object(
          'last_request_id', p_request_id,
          'last_checks', pg_catalog.to_jsonb(coalesce(p_checks, array[]::text[])),
          'threshold', p_threshold,
          'window_minutes', p_window_minutes,
          'recent_count', v_recent_count
        )
    where id = v_incident_id;
  end if;

  return pg_catalog.jsonb_build_object(
    'alerted', true,
    'incident_id', v_incident_id,
    'recent_count', v_recent_count,
    'threshold', p_threshold
  );
end;
$$;

revoke all on function public.record_compliance_intervention_alert(
  text,
  text,
  text[],
  integer,
  integer
) from public, anon, authenticated;

grant execute on function public.record_compliance_intervention_alert(
  text,
  text,
  text[],
  integer,
  integer
) to service_role;

comment on function public.record_compliance_intervention_alert(
  text,
  text,
  text[],
  integer,
  integer
) is 'Creates or updates a privacy-safe platform incident after repeated Copilot compliance interventions. Service role only.';

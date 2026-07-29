-- Run after function-exposure-hardening.sql.
-- The block raises an exception if an internal function remains callable by an
-- unintended browser-facing role or retains a mutable search_path.

do $$
declare
  exposed_internal_count integer;
  anonymous_integration_count integer;
  authenticated_integration_count integer;
  mutable_path_count integer;
begin
  select count(*)
    into exposed_internal_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'execute_sql',
      'get_user_org_ids',
      'set_updated_at',
      'trigger_outbound_message_sender',
      'trigger_process_message_ai'
    )
    and (
      has_function_privilege('anon', p.oid, 'execute')
      or has_function_privilege('authenticated', p.oid, 'execute')
    );

  if exposed_internal_count <> 0 then
    raise exception 'Expected zero client-executable internal functions, found %', exposed_internal_count;
  end if;

  select count(*) filter (where has_function_privilege('anon', p.oid, 'execute')),
         count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute'))
    into anonymous_integration_count, authenticated_integration_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'upsert_integration';

  if anonymous_integration_count <> 0 or authenticated_integration_count <> 1 then
    raise exception 'Expected upsert_integration to be authenticated-only during callback migration';
  end if;

  select count(*)
    into mutable_path_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'execute_sql',
      'get_user_org_ids',
      'set_updated_at',
      'trigger_outbound_message_sender',
      'trigger_process_message_ai',
      'upsert_integration'
    )
    and not exists (
      select 1
      from unnest(coalesce(p.proconfig, array[]::text[])) setting
      where setting like 'search_path=%'
    );

  if mutable_path_count <> 0 then
    raise exception 'Expected pinned search_path on all internal functions, found % mutable functions', mutable_path_count;
  end if;
end
$$;

select p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       has_function_privilege('anon', p.oid, 'execute') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'execute') as service_role_execute,
       p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'execute_sql',
    'get_user_org_ids',
    'set_updated_at',
    'trigger_outbound_message_sender',
    'trigger_process_message_ai',
    'upsert_integration'
  )
order by p.proname;

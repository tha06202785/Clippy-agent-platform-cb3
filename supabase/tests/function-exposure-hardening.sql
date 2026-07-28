-- Run after function-exposure-hardening.sql.
-- The block raises an exception if an internal function remains callable by a
-- browser-facing database role or retains a mutable search_path.

do $$
declare
  exposed_count integer;
  mutable_path_count integer;
begin
  select count(*)
    into exposed_count
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
    and (
      has_function_privilege('anon', p.oid, 'execute')
      or has_function_privilege('authenticated', p.oid, 'execute')
    );

  if exposed_count <> 0 then
    raise exception 'Expected zero client-executable internal functions, found %', exposed_count;
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

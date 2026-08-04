-- Apply only after the Facebook OAuth callback uses createAdminClient and no
-- browser-facing route calls upsert_integration.

begin;

revoke all on function public.upsert_integration(uuid, text, text, jsonb, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.upsert_integration(uuid, text, text, jsonb, timestamptz, text)
  to service_role;

commit;

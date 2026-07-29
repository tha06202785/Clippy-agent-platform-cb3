-- Review and test this migration before applying it to production.
-- It removes direct API execution of internal database functions and pins
-- their object-resolution paths to trusted schemas.

begin;

alter function public.execute_sql(text)
  set search_path = pg_catalog, public;
alter function public.get_user_org_ids()
  set search_path = pg_catalog, public;
alter function public.set_updated_at()
  set search_path = pg_catalog, public;
alter function public.trigger_outbound_message_sender()
  set search_path = pg_catalog, public;
alter function public.trigger_process_message_ai()
  set search_path = pg_catalog, public;
alter function public.upsert_integration(uuid, text, text, jsonb, timestamptz, text)
  set search_path = pg_catalog, public;

-- PUBLIC grants are inherited by anon and authenticated. Revoke both the
-- inherited and any explicit grants from functions that are strictly internal.
revoke all on function public.execute_sql(text) from public, anon, authenticated;
revoke all on function public.get_user_org_ids() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.trigger_outbound_message_sender() from public, anon, authenticated;
revoke all on function public.trigger_process_message_ai() from public, anon, authenticated;

-- Facebook's current OAuth callback still invokes this RPC with the signed-in
-- user's session. Remove anonymous/public access now, but retain authenticated
-- execution until that callback is migrated to a server-only write path.
revoke all on function public.upsert_integration(uuid, text, text, jsonb, timestamptz, text)
  from public, anon;
grant execute on function public.upsert_integration(uuid, text, text, jsonb, timestamptz, text)
  to authenticated;

-- Backend maintenance may still call the administrative helpers explicitly.
-- Trigger functions do not require callers to hold EXECUTE when fired by their
-- bound trigger, but service_role access is retained for controlled operations.
grant execute on function public.execute_sql(text) to service_role;
grant execute on function public.get_user_org_ids() to service_role;
grant execute on function public.set_updated_at() to service_role;
grant execute on function public.trigger_outbound_message_sender() to service_role;
grant execute on function public.trigger_process_message_ai() to service_role;
grant execute on function public.upsert_integration(uuid, text, text, jsonb, timestamptz, text)
  to service_role;

commit;

-- Prevent authenticated Data API callers from selecting OAuth credentials.
-- Server routes use service_role and return an explicit safe response shape.

begin;

revoke select on table public.integrations from anon, authenticated;

grant select (
  id,
  org_id,
  provider,
  status,
  settings_json,
  connected_at,
  created_at,
  updated_at
) on table public.integrations to authenticated;

commit;

-- Verification: authenticated must not have column SELECT on the secret field.
select
  has_column_privilege(
    'authenticated',
    'public.integrations',
    'credentials_encrypted',
    'select'
  ) as authenticated_can_read_credentials,
  has_column_privilege(
    'service_role',
    'public.integrations',
    'credentials_encrypted',
    'select'
  ) as service_role_can_read_credentials;

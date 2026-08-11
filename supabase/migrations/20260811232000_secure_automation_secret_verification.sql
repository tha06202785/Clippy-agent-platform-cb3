create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table if not exists private.automation_secrets (
  name text primary key,
  secret_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on table private.automation_secrets from public, anon, authenticated;

create or replace function public.verify_automation_secret(
  p_name text,
  p_secret text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    length(coalesce(p_secret, '')) >= 32
    and exists (
      select 1
      from private.automation_secrets
      where name = p_name
        and secret_hash = encode(extensions.digest(p_secret, 'sha256'), 'hex')
    );
$$;

revoke all on function public.verify_automation_secret(text, text)
  from public, anon, authenticated;
grant execute on function public.verify_automation_secret(text, text)
  to service_role;

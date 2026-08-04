-- Rollback-only tenant isolation test.
-- Apply supabase/security/rls-remaining-tenant-hardening.sql first.

begin;

do $$
declare
  user_a constant uuid := '11000000-0000-4000-8000-000000000001';
  user_b constant uuid := '11000000-0000-4000-8000-000000000002';
  org_a constant uuid := '21000000-0000-4000-8000-000000000001';
  org_b constant uuid := '21000000-0000-4000-8000-000000000002';
begin
  insert into auth.users (
    instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at
  ) values
    ('00000000-0000-0000-0000-000000000000',user_a,'authenticated','authenticated',
     'remaining-rls-a@example.invalid','',now(),now(),now()),
    ('00000000-0000-0000-0000-000000000000',user_b,'authenticated','authenticated',
     'remaining-rls-b@example.invalid','',now(),now(),now());

  insert into public.orgs (id,name)
  values (org_a,'Remaining RLS Org A'),(org_b,'Remaining RLS Org B');

  insert into public.user_org_roles (user_id,org_id,role)
  values (user_a,org_a::text,'member'),(user_b,org_b::text,'member');

  insert into public.listings (org_id,address,status)
  values (org_a::text,'Tenant A test listing','active'),
         (org_b::text,'Tenant B test listing','active');

  insert into public.integrations (org_id,provider,status,credentials_encrypted)
  values (org_a,'rls-test','connected','secret-a'),
         (org_b,'rls-test','connected','secret-b');
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
begin
  if (select count(*) from public.listings where address like 'Tenant % test listing') <> 1 then
    raise exception 'Listings tenant isolation failed';
  end if;
  if (select count(*) from public.integrations where provider = 'rls-test') <> 1 then
    raise exception 'Integrations tenant isolation failed';
  end if;

  update public.listings
  set status = 'updated-by-a'
  where address = 'Tenant B test listing';
  if found then
    raise exception 'Cross-tenant listing update unexpectedly succeeded';
  end if;

  begin
    insert into public.listings (org_id,address,status)
    values ('21000000-0000-4000-8000-000000000002','Cross-tenant insert','active');
    raise exception 'Cross-tenant listing insert unexpectedly succeeded';
  exception
    when insufficient_privilege or check_violation then null;
  end;

  begin
    insert into public.integrations (org_id,provider,status)
    values ('21000000-0000-4000-8000-000000000001','browser-write-test','connected');
    raise exception 'Browser integration write unexpectedly succeeded';
  exception
    when insufficient_privilege or check_violation then null;
  end;
end;
$$;

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
begin
  if (select count(*) from public.listings where address like 'Tenant % test listing') <> 0 then
    raise exception 'Anonymous listing read unexpectedly succeeded';
  end if;
  if (select count(*) from public.integrations where provider = 'rls-test') <> 0 then
    raise exception 'Anonymous integration read unexpectedly succeeded';
  end if;
end;
$$;

reset role;
rollback;

-- Run only against an disposable Supabase development branch after applying
-- supabase/security/rls-dashboard-hardening.sql. The transaction rolls back all
-- fixtures. Any failed assertion aborts the script.

begin;

do $$
declare
  user_a constant uuid := '10000000-0000-4000-8000-000000000001';
  user_b constant uuid := '10000000-0000-4000-8000-000000000002';
  org_a constant uuid := '20000000-0000-4000-8000-000000000001';
  org_b constant uuid := '20000000-0000-4000-8000-000000000002';
  lead_a constant uuid := '30000000-0000-4000-8000-000000000001';
  lead_b constant uuid := '30000000-0000-4000-8000-000000000002';
  conversation_a constant uuid := '40000000-0000-4000-8000-000000000001';
  conversation_b constant uuid := '40000000-0000-4000-8000-000000000002';
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
  )
  values
    (
      '00000000-0000-0000-0000-000000000000',
      user_a,
      'authenticated',
      'authenticated',
      'rls-user-a@example.invalid',
      '',
      now(),
      now(),
      now()
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      user_b,
      'authenticated',
      'authenticated',
      'rls-user-b@example.invalid',
      '',
      now(),
      now(),
      now()
    );

  insert into public.orgs (id, name)
  values (org_a, 'RLS Test Organisation A'), (org_b, 'RLS Test Organisation B');

  insert into public.profiles (user_id, full_name)
  values (user_a, 'RLS User A'), (user_b, 'RLS User B');

  insert into public.user_org_roles (user_id, org_id, role)
  values
    (user_a, org_a::text, 'member'),
    (user_b, org_b::text, 'member');

  insert into public.leads (id, org_id, full_name)
  values (lead_a, org_a, 'Lead A'), (lead_b, org_b, 'Lead B');

  insert into public.conversations (id, org_id, lead_id, channel)
  values
    (conversation_a, org_a::text, lead_a, 'email'),
    (conversation_b, org_b::text, lead_b, 'email');

  insert into public.messages (
    org_id,
    conversation_id,
    direction_in_out,
    text
  )
  values
    (org_a::text, conversation_a, 'in', 'Organisation A message'),
    (org_b::text, conversation_b, 'in', 'Organisation B message');

  insert into public.tasks (org_id, lead_id, type, title, due_at)
  values
    (org_a::text, lead_a, 'follow_up', 'Organisation A task', now()),
    (org_b::text, lead_b, 'follow_up', 'Organisation B task', now());
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
begin
  if (select count(*) from public.orgs) <> 1 then
    raise exception 'Tenant isolation failed for orgs';
  end if;
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'Tenant isolation failed for profiles';
  end if;
  if (select count(*) from public.leads) <> 1 then
    raise exception 'Tenant isolation failed for leads';
  end if;
  if (select count(*) from public.conversations) <> 1 then
    raise exception 'Tenant isolation failed for conversations';
  end if;
  if (select count(*) from public.messages) <> 1 then
    raise exception 'Tenant isolation failed for messages';
  end if;
  if (select count(*) from public.tasks) <> 1 then
    raise exception 'Tenant isolation failed for tasks';
  end if;
  if (select count(*) from public.user_org_roles) <> 1 then
    raise exception 'Tenant isolation failed for memberships';
  end if;
end;
$$;

do $$
begin
  begin
    insert into public.user_org_roles (user_id, org_id, role)
    values (
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000002',
      'owner'
    );
    raise exception 'Membership escalation unexpectedly succeeded';
  exception
    when insufficient_privilege then
      null;
    when check_violation then
      null;
  end;
end;
$$;

reset role;
rollback;

-- NewClippy dashboard RLS hardening.
--
-- REVIEW BEFORE APPLYING. This script intentionally removes legacy read-bypass
-- policies observed in the live project and replaces them with explicit,
-- organisation-scoped read policies. It does not modify production by itself.

begin;

alter table public.leads enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.tasks enable row level security;
alter table public.orgs enable row level security;
alter table public.profiles enable row level security;
alter table public.user_org_roles enable row level security;

drop policy if exists "Testing bypass for reads - leads" on public.leads;
drop policy if exists "allow_org_access_leads" on public.leads;
drop policy if exists "leads_select_policy" on public.leads;

drop policy if exists "Testing bypass for reads - conversations" on public.conversations;
drop policy if exists "allow_org_access_conversations" on public.conversations;
drop policy if exists "conversations_select_policy" on public.conversations;

drop policy if exists "Testing bypass for reads - messages" on public.messages;
drop policy if exists "allow_org_access_messages" on public.messages;
drop policy if exists "messages_select_policy" on public.messages;

drop policy if exists "Testing bypass for reads - tasks" on public.tasks;
drop policy if exists "allow_org_access_tasks" on public.tasks;
drop policy if exists "tasks_select_policy" on public.tasks;

drop policy if exists "Testing bypass for reads - orgs" on public.orgs;
drop policy if exists "orgs_view_policy" on public.orgs;
drop policy if exists "Enable read access for all authenticated users on orgs" on public.orgs;

drop policy if exists "Public profiles are viewable by everyone." on public.profiles;

-- Membership is an authorization boundary. End users must not be able to add
-- themselves to another organisation or promote their own role.
drop policy if exists "Users can insert their own org roles" on public.user_org_roles;
drop policy if exists "Users can update their own org roles" on public.user_org_roles;
drop policy if exists "Users can delete their own org roles" on public.user_org_roles;
drop policy if exists "Users can view their own org roles" on public.user_org_roles;

drop policy if exists "Users read their own organisation roles" on public.user_org_roles;
create policy "Users read their own organisation roles"
on public.user_org_roles
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Members read organisation leads" on public.leads;
create policy "Members read organisation leads"
on public.leads
for select
to authenticated
using (
  exists (
    select 1
    from public.user_org_roles as membership
    where membership.user_id = (select auth.uid())
      and membership.org_id = leads.org_id::text
  )
);

drop policy if exists "Members read organisation conversations" on public.conversations;
create policy "Members read organisation conversations"
on public.conversations
for select
to authenticated
using (
  exists (
    select 1
    from public.user_org_roles as membership
    where membership.user_id = (select auth.uid())
      and membership.org_id = conversations.org_id
  )
);

drop policy if exists "Members read organisation messages" on public.messages;
create policy "Members read organisation messages"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.user_org_roles as membership
    where membership.user_id = (select auth.uid())
      and membership.org_id = messages.org_id
  )
);

drop policy if exists "Members read organisation tasks" on public.tasks;
create policy "Members read organisation tasks"
on public.tasks
for select
to authenticated
using (
  exists (
    select 1
    from public.user_org_roles as membership
    where membership.user_id = (select auth.uid())
      and membership.org_id = tasks.org_id
  )
);

drop policy if exists "Members read their organisations" on public.orgs;
create policy "Members read their organisations"
on public.orgs
for select
to authenticated
using (
  exists (
    select 1
    from public.user_org_roles as membership
    where membership.user_id = (select auth.uid())
      and membership.org_id = orgs.id::text
  )
);

drop policy if exists "Users read their own profile" on public.profiles;
create policy "Users read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists user_org_roles_user_org_idx
  on public.user_org_roles (user_id, org_id);
create index if not exists leads_org_id_idx
  on public.leads (org_id);
create index if not exists conversations_org_id_idx
  on public.conversations (org_id);
create index if not exists messages_org_id_idx
  on public.messages (org_id);
create index if not exists tasks_org_id_idx
  on public.tasks (org_id);

commit;

-- Post-deployment verification: this should return no permissive true-read
-- policies for the protected dashboard tables.
select schemaname, tablename, policyname, roles, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename in (
    'leads',
    'conversations',
    'messages',
    'tasks',
    'orgs',
    'profiles',
    'user_org_roles'
  )
  and cmd in ('SELECT', 'ALL')
  and coalesce(qual, '') in ('true', '(true)')
order by tablename, policyname;

-- Membership writes should only be performed by a trusted server/admin path.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'user_org_roles'
  and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
order by policyname;

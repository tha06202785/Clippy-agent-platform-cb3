-- Consolidate legacy tenant policies on high-traffic operational tables.
-- Each table keeps the same organisation-membership rule, now explicitly
-- scoped to authenticated users with both USING and WITH CHECK.

drop policy if exists "Enable all access for users belonging to their org_id on leads" on public.leads;
drop policy if exists "Members read organisation leads" on public.leads;
create policy "leads_members_manage"
on public.leads for all to authenticated
using (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = leads.org_id::text
))
with check (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = leads.org_id::text
));

drop policy if exists "Enable all access for users belonging to their org_id on conver" on public.conversations;
drop policy if exists "Members read organisation conversations" on public.conversations;
create policy "conversations_members_manage"
on public.conversations for all to authenticated
using (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = conversations.org_id
))
with check (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = conversations.org_id
));

drop policy if exists "Enable all access for users belonging to their org_id on messag" on public.messages;
drop policy if exists "Tenant isolation ALL - messages" on public.messages;
drop policy if exists "Members read organisation messages" on public.messages;
create policy "messages_members_manage"
on public.messages for all to authenticated
using (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = messages.org_id
))
with check (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = messages.org_id
));

drop policy if exists "Enable all access for users belonging to their org_id on tasks" on public.tasks;
drop policy if exists "Members read organisation tasks" on public.tasks;
create policy "tasks_members_manage"
on public.tasks for all to authenticated
using (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = tasks.org_id
))
with check (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = tasks.org_id
));

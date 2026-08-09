-- Replaces legacy public/USING (true) policies with tenant-scoped access.
-- Server-managed writes continue through service_role, which bypasses RLS.

begin;

-- Direct org membership predicate:
-- exists (
--   select 1 from public.user_org_roles membership
--   where membership.user_id = (select auth.uid())
--     and membership.org_id = <table>.org_id::text
-- )

-- Automation settings: members may read, create and update their org settings.
drop policy if exists "automation_settings_insert" on public.automation_settings;
drop policy if exists "automation_settings_select" on public.automation_settings;
drop policy if exists "automation_settings_update" on public.automation_settings;
create policy "Members read organisation automation settings"
on public.automation_settings for select to authenticated
using (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = automation_settings.org_id::text
));
create policy "Members create organisation automation settings"
on public.automation_settings for insert to authenticated
with check (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = automation_settings.org_id::text
));
create policy "Members update organisation automation settings"
on public.automation_settings for update to authenticated
using (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = automation_settings.org_id::text
))
with check (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = automation_settings.org_id::text
));

-- Briefings: members may read and create within their organisation.
drop policy if exists "briefings_insert" on public.briefings;
drop policy if exists "briefings_select" on public.briefings;
create policy "Members read organisation briefings"
on public.briefings for select to authenticated
using (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = briefings.org_id::text
));
create policy "Members create organisation briefings"
on public.briefings for insert to authenticated
with check (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = briefings.org_id::text
));

-- Server-generated content packs: members read only.
drop policy if exists "Testing bypass for reads - content_packs" on public.content_packs;
drop policy if exists "allow_org_access_content_packs" on public.content_packs;
drop policy if exists "content_packs_select_policy" on public.content_packs;
create policy "Members read organisation content packs"
on public.content_packs for select to authenticated
using (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = content_packs.org_id::text
));

-- Credentials and billing records are server-managed; members receive row-scoped read access.
drop policy if exists "allow_org_access_integrations" on public.integrations;
drop policy if exists "integrations_select_policy" on public.integrations;
create policy "Members read organisation integrations"
on public.integrations for select to authenticated
using (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = integrations.org_id::text
));

drop policy if exists "allow_org_access_subscriptions" on public.subscriptions;
drop policy if exists "subscriptions_select_policy" on public.subscriptions;
create policy "Members read organisation subscriptions"
on public.subscriptions for select to authenticated
using (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = subscriptions.org_id::text
));

drop policy if exists "allow_org_access_usage_events" on public.usage_events;
drop policy if exists "usage_events_select_policy" on public.usage_events;
create policy "Members read organisation usage events"
on public.usage_events for select to authenticated
using (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = usage_events.org_id::text
));

-- Lead metadata retains the intended member CRUD model, now with WITH CHECK.
drop policy if exists "Enable all access for users belonging to their org_id on lead_e" on public.lead_events;
drop policy if exists "allow_org_access_lead_events" on public.lead_events;
drop policy if exists "lead_events_select_policy" on public.lead_events;
create policy "Members manage organisation lead events"
on public.lead_events for all to authenticated
using (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = lead_events.org_id::text
))
with check (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = lead_events.org_id::text
));

drop policy if exists "Enable all access for users belonging to their org_id on lead_i" on public.lead_identities;
drop policy if exists "allow_org_access_lead_identities" on public.lead_identities;
drop policy if exists "lead_identities_select_policy" on public.lead_identities;
create policy "Members manage organisation lead identities"
on public.lead_identities for all to authenticated
using (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = lead_identities.org_id::text
))
with check (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = lead_identities.org_id::text
));

-- Listings retain member CRUD; assets remain read-only to browser clients.
drop policy if exists "Enable all access for users belonging to their org_id on listin" on public.listings;
drop policy if exists "allow_org_access_listings" on public.listings;
drop policy if exists "listings_select_policy" on public.listings;
create policy "Members manage organisation listings"
on public.listings for all to authenticated
using (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = listings.org_id::text
))
with check (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = listings.org_id::text
));

drop policy if exists "allow_org_access_listing_assets" on public.listing_assets;
drop policy if exists "listing_assets_select_policy" on public.listing_assets;
create policy "Members read organisation listing assets"
on public.listing_assets for select to authenticated
using (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = listing_assets.org_id::text
));

-- Rooms inherit tenant membership through rooms.org_id.
drop policy if exists "rooms_insert" on public.rooms;
drop policy if exists "rooms_select" on public.rooms;
drop policy if exists "rooms_update" on public.rooms;
create policy "Members read organisation rooms"
on public.rooms for select to authenticated
using (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = rooms.org_id::text
));
create policy "Members create organisation rooms"
on public.rooms for insert to authenticated
with check (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = rooms.org_id::text
));
create policy "Members update organisation rooms"
on public.rooms for update to authenticated
using (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = rooms.org_id::text
))
with check (exists (
  select 1 from public.user_org_roles membership
  where membership.user_id = (select auth.uid())
    and membership.org_id = rooms.org_id::text
));

drop policy if exists "room_members_insert" on public.room_members;
drop policy if exists "room_members_select" on public.room_members;
create policy "Members read organisation room members"
on public.room_members for select to authenticated
using (exists (
  select 1
  from public.rooms room
  join public.user_org_roles membership on membership.org_id = room.org_id::text
  where room.id = room_members.room_id
    and membership.user_id = (select auth.uid())
));
create policy "Members add organisation room members"
on public.room_members for insert to authenticated
with check (exists (
  select 1
  from public.rooms room
  join public.user_org_roles membership on membership.org_id = room.org_id::text
  where room.id = room_members.room_id
    and membership.user_id = (select auth.uid())
));

drop policy if exists "room_activity_insert" on public.room_activity;
drop policy if exists "room_activity_select" on public.room_activity;
create policy "Members read organisation room activity"
on public.room_activity for select to authenticated
using (exists (
  select 1
  from public.rooms room
  join public.user_org_roles membership on membership.org_id = room.org_id::text
  where room.id = room_activity.room_id
    and membership.user_id = (select auth.uid())
));
create policy "Members create organisation room activity"
on public.room_activity for insert to authenticated
with check (exists (
  select 1
  from public.rooms room
  join public.user_org_roles membership on membership.org_id = room.org_id::text
  where room.id = room_activity.room_id
    and membership.user_id = (select auth.uid())
));

create index if not exists automation_settings_org_id_idx on public.automation_settings (org_id);
create index if not exists briefings_org_id_idx on public.briefings (org_id);
create index if not exists content_packs_org_id_idx on public.content_packs (org_id);
create index if not exists integrations_org_id_idx on public.integrations (org_id);
create index if not exists lead_events_org_id_idx on public.lead_events (org_id);
create index if not exists lead_identities_org_id_idx on public.lead_identities (org_id);
create index if not exists listing_assets_org_id_idx on public.listing_assets (org_id);
create index if not exists listings_org_id_idx on public.listings (org_id);
create index if not exists rooms_org_id_idx on public.rooms (org_id);
create index if not exists subscriptions_org_id_idx on public.subscriptions (org_id);
create index if not exists usage_events_org_id_idx on public.usage_events (org_id);
create index if not exists room_members_room_id_idx on public.room_members (room_id);
create index if not exists room_activity_room_id_idx on public.room_activity (room_id);

commit;

-- Verification: must return zero rows.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'automation_settings','briefings','content_packs','integrations',
    'lead_events','lead_identities','listing_assets','listings',
    'room_activity','room_members','rooms','subscriptions','usage_events'
  )
  and (
    'public' = any(roles)
    or coalesce(qual, '') in ('true', '(true)')
    or coalesce(with_check, '') in ('true', '(true)')
  )
order by tablename, policyname;

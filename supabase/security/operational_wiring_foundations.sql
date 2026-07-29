-- Operational wiring foundations for inspections and truthful daily briefings.
-- This file is designed to be applied after complete_pipeline_and_ai_usage.sql.

create table if not exists public.inspection_time_slots (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  listing_id uuid not null references public.listings(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null default 1 check (capacity > 0),
  booking_count integer not null default 0 check (booking_count >= 0 and booking_count <= capacity),
  inspection_type text not null default 'open',
  address text,
  status text not null default 'published' check (status in ('draft','published','cancelled','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.inspection_bookings (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  slot_id uuid not null references public.inspection_time_slots(id) on delete restrict,
  listing_id uuid not null references public.listings(id) on delete restrict,
  lead_id uuid not null references public.leads(id) on delete restrict,
  conversation_id uuid references public.conversations(id) on delete set null,
  booking_status text not null default 'confirmed' check (booking_status in ('reserved','confirmed','cancelled')),
  attendance_status text not null default 'unknown' check (attendance_status in ('unknown','attended','did_not_attend')),
  attendee_count integer not null default 1 check (attendee_count > 0),
  source_channel text not null default 'website',
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scheduled_communications (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  lead_id uuid not null references public.leads(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  inspection_booking_id uuid references public.inspection_bookings(id) on delete cascade,
  type text not null,
  channel text not null,
  scheduled_for timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','processing','sent','failed','cancelled')),
  idempotency_key text not null unique,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_summaries (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  date date not null,
  conversations_handled integer not null default 0,
  inspections_booked integer not null default 0,
  hot_leads_identified integer not null default 0,
  escalations_count integer not null default 0,
  pipeline_value numeric not null default 0,
  summary_text text not null,
  created_at timestamptz not null default now(),
  unique (org_id, date)
);

create index if not exists inspection_slots_org_start_idx on public.inspection_time_slots(org_id, starts_at);
create index if not exists inspection_bookings_org_created_idx on public.inspection_bookings(org_id, created_at desc);
create index if not exists scheduled_comms_due_idx on public.scheduled_communications(status, scheduled_for);
create index if not exists ai_summaries_org_date_idx on public.ai_summaries(org_id, date desc);

alter table public.inspection_time_slots enable row level security;
alter table public.inspection_bookings enable row level security;
alter table public.scheduled_communications enable row level security;
alter table public.ai_summaries enable row level security;

grant select, insert, update, delete on public.inspection_time_slots to authenticated;
grant select, insert, update, delete on public.inspection_bookings to authenticated;
grant select, insert, update, delete on public.scheduled_communications to authenticated;
grant select, insert, update on public.ai_summaries to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['inspection_time_slots','inspection_bookings','scheduled_communications','ai_summaries']
  loop
    execute format('drop policy if exists "Tenant members access %1$s" on public.%1$I', table_name);
    execute format(
      'create policy "Tenant members access %1$s" on public.%1$I for all to authenticated using (exists (select 1 from public.user_org_roles m where m.user_id = (select auth.uid()) and m.org_id = %1$I.org_id)) with check (exists (select 1 from public.user_org_roles m where m.user_id = (select auth.uid()) and m.org_id = %1$I.org_id))',
      table_name
    );
  end loop;
end $$;

create or replace function public.reserve_inspection(
  p_slot_id uuid,
  p_listing_id uuid,
  p_lead_id uuid,
  p_conversation_id uuid default null,
  p_attendee_count integer default 1,
  p_source_channel text default 'website'
) returns public.inspection_bookings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller uuid := auth.uid();
  slot_row public.inspection_time_slots;
  booking public.inspection_bookings;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if coalesce(p_attendee_count, 0) < 1 then raise exception 'Attendee count must be positive'; end if;

  select * into slot_row from public.inspection_time_slots where id = p_slot_id for update;
  if not found then raise exception 'Slot not found'; end if;
  if not exists (select 1 from public.user_org_roles m where m.user_id = caller and m.org_id = slot_row.org_id) then
    raise exception 'Organisation access denied';
  end if;
  if slot_row.status <> 'published' then raise exception 'Slot is not available'; end if;
  if slot_row.listing_id <> p_listing_id then raise exception 'Listing does not match slot'; end if;
  if slot_row.booking_count + p_attendee_count > slot_row.capacity then raise exception 'Slot is full'; end if;
  if not exists (select 1 from public.leads l where l.id = p_lead_id and l.org_id::text = slot_row.org_id) then
    raise exception 'Lead does not belong to organisation';
  end if;

  insert into public.inspection_bookings (
    org_id, slot_id, listing_id, lead_id, conversation_id,
    attendee_count, source_channel, booking_status
  ) values (
    slot_row.org_id, p_slot_id, p_listing_id, p_lead_id, p_conversation_id,
    p_attendee_count, coalesce(nullif(p_source_channel,''),'website'), 'confirmed'
  ) returning * into booking;

  update public.inspection_time_slots
  set booking_count = booking_count + p_attendee_count, updated_at = now()
  where id = p_slot_id;

  return booking;
end;
$$;

revoke all on function public.reserve_inspection(uuid,uuid,uuid,uuid,integer,text) from public, anon;
grant execute on function public.reserve_inspection(uuid,uuid,uuid,uuid,integer,text) to authenticated;

create or replace function public.cancel_inspection(p_booking_id uuid, p_reason text default 'cancelled_by_agent')
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller uuid := auth.uid();
  booking public.inspection_bookings;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select * into booking from public.inspection_bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if not exists (select 1 from public.user_org_roles m where m.user_id = caller and m.org_id = booking.org_id) then
    raise exception 'Organisation access denied';
  end if;
  if booking.booking_status = 'cancelled' then return; end if;

  update public.inspection_bookings
  set booking_status='cancelled', cancelled_at=now(), cancellation_reason=p_reason, updated_at=now()
  where id=p_booking_id;

  update public.inspection_time_slots
  set booking_count=greatest(0, booking_count-booking.attendee_count), updated_at=now()
  where id=booking.slot_id;

  update public.scheduled_communications
  set status='cancelled', cancelled_at=now(), updated_at=now()
  where inspection_booking_id=p_booking_id and status in ('scheduled','processing');
end;
$$;

revoke all on function public.cancel_inspection(uuid,text) from public, anon;
grant execute on function public.cancel_inspection(uuid,text) to authenticated;

alter table public.property_enquiries
  add column if not exists booking_token uuid default gen_random_uuid();

update public.property_enquiries
set booking_token = gen_random_uuid()
where booking_token is null;

alter table public.property_enquiries
  alter column booking_token set not null;

create unique index if not exists property_enquiries_booking_token_key
  on public.property_enquiries (booking_token);

alter table public.inspection_bookings
  add column if not exists enquiry_id uuid,
  add column if not exists client_calendar_token uuid default gen_random_uuid(),
  add column if not exists google_calendar_event_id text,
  add column if not exists google_calendar_html_link text,
  add column if not exists calendar_sync_status text not null default 'pending',
  add column if not exists calendar_sync_error text,
  add column if not exists confirmation_sent_at timestamptz;

update public.inspection_bookings
set client_calendar_token = gen_random_uuid()
where client_calendar_token is null;

alter table public.inspection_bookings
  alter column client_calendar_token set not null;

create unique index if not exists inspection_bookings_calendar_token_key
  on public.inspection_bookings (client_calendar_token);

create unique index if not exists inspection_bookings_active_lead_slot_key
  on public.inspection_bookings (slot_id, lead_id)
  where booking_status <> 'cancelled';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'inspection_bookings_enquiry_id_fkey'
      and conrelid = 'public.inspection_bookings'::regclass
  ) then
    alter table public.inspection_bookings
      add constraint inspection_bookings_enquiry_id_fkey
      foreign key (enquiry_id)
      references public.property_enquiries(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'inspection_bookings_calendar_sync_status_check'
      and conrelid = 'public.inspection_bookings'::regclass
  ) then
    alter table public.inspection_bookings
      add constraint inspection_bookings_calendar_sync_status_check
      check (calendar_sync_status in ('pending', 'synced', 'failed', 'cancelled'));
  end if;
end
$$;

create or replace function public.reserve_public_inspection(
  p_booking_token uuid,
  p_slot_id uuid,
  p_attendee_count integer default 1
)
returns public.inspection_bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  enquiry public.property_enquiries;
  slot_row public.inspection_time_slots;
  booking public.inspection_bookings;
  conversation_id uuid;
begin
  if coalesce(p_attendee_count, 0) < 1 or p_attendee_count > 10 then
    raise exception 'Attendee count must be between 1 and 10';
  end if;

  select * into enquiry
  from public.property_enquiries
  where booking_token = p_booking_token
    and status in ('active', 'contacted', 'qualified')
  for update;
  if not found or enquiry.listing_id is null then
    raise exception 'Booking link is not available';
  end if;

  select * into slot_row
  from public.inspection_time_slots
  where id = p_slot_id
  for update;
  if not found
    or slot_row.org_id <> enquiry.org_id
    or slot_row.listing_id <> enquiry.listing_id
    or slot_row.status <> 'published'
    or slot_row.starts_at <= now()
  then
    raise exception 'Inspection slot is not available';
  end if;
  if slot_row.booking_count + p_attendee_count > slot_row.capacity then
    raise exception 'Inspection slot is full';
  end if;

  select id into conversation_id
  from public.conversations
  where org_id = enquiry.org_id
    and enquiry_id = enquiry.id
    and channel = 'email'
  order by created_at desc
  limit 1;

  insert into public.inspection_bookings (
    org_id,
    slot_id,
    listing_id,
    lead_id,
    conversation_id,
    enquiry_id,
    attendee_count,
    source_channel,
    booking_status
  ) values (
    enquiry.org_id,
    slot_row.id,
    enquiry.listing_id,
    enquiry.lead_id,
    conversation_id,
    enquiry.id,
    p_attendee_count,
    'client_booking_link',
    'confirmed'
  )
  returning * into booking;

  update public.inspection_time_slots
  set booking_count = booking_count + p_attendee_count,
      updated_at = now()
  where id = slot_row.id;

  update public.property_enquiries
  set status = 'inspection_booked',
      last_activity_at = now(),
      updated_at = now()
  where id = enquiry.id;

  return booking;
end;
$$;

revoke all on function public.reserve_public_inspection(uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_public_inspection(uuid, uuid, integer)
  to service_role;

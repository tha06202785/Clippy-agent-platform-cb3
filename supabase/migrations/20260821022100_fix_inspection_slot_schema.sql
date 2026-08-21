-- Keep manual inspection-slot creation aligned with the application model.
alter table public.inspection_time_slots
  add column if not exists timezone text not null default 'Australia/Melbourne',
  add column if not exists location_notes text;

comment on column public.inspection_time_slots.timezone is
  'IANA timezone used when the inspection slot was created.';

comment on column public.inspection_time_slots.location_notes is
  'Optional arrival or access instructions for the inspection.';

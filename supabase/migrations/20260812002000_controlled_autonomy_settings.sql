alter table public.automation_settings
  add column if not exists action_modes jsonb not null default jsonb_build_object(
    'client_import', 'automatic',
    'client_record_updates', 'automatic',
    'booking_confirmation', 'automatic',
    'inspection_reminders', 'automatic',
    'booking_link_reply', 'approval',
    'new_enquiry_reply', 'approval',
    'no_response_follow_up', 'approval',
    'appointment_changes', 'approval',
    'marketing_messages', 'off',
    'negotiation_messages', 'off'
  ),
  add column if not exists max_automated_messages_per_client_day integer not null default 4,
  add column if not exists minimum_confidence numeric(4,3) not null default 0.900,
  add column if not exists quiet_hours_start time not null default '20:00',
  add column if not exists quiet_hours_end time not null default '08:00';

alter table public.automation_settings
  drop constraint if exists automation_settings_action_modes_object_check,
  add constraint automation_settings_action_modes_object_check
    check (jsonb_typeof(action_modes) = 'object'),
  drop constraint if exists automation_settings_message_limit_check,
  add constraint automation_settings_message_limit_check
    check (max_automated_messages_per_client_day between 1 and 20),
  drop constraint if exists automation_settings_confidence_check,
  add constraint automation_settings_confidence_check
    check (minimum_confidence between 0 and 1);

create table if not exists public.automation_approvals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  action_key text not null,
  channel text not null,
  recipient text not null,
  subject text,
  content text not null,
  lead_id uuid references public.leads(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  inspection_booking_id uuid references public.inspection_bookings(id) on delete cascade,
  scheduled_communication_id uuid references public.scheduled_communications(id) on delete set null,
  confidence numeric(4,3),
  reason text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'expired')),
  idempotency_key text not null unique,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by_user_id uuid references auth.users(id) on delete set null,
  delivery_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists automation_approvals_org_status_idx
  on public.automation_approvals (org_id, status, requested_at desc);

alter table public.automation_approvals enable row level security;

drop policy if exists "Members read organisation automation approvals"
  on public.automation_approvals;
create policy "Members read organisation automation approvals"
on public.automation_approvals
for select
to authenticated
using (
  exists (
    select 1
    from public.user_org_roles membership
    where membership.user_id = (select auth.uid())
      and membership.org_id = automation_approvals.org_id::text
  )
);

revoke all on public.automation_approvals from anon, authenticated;
grant select on public.automation_approvals to authenticated;
grant all on public.automation_approvals to service_role;

alter table public.scheduled_communications
  drop constraint if exists scheduled_communications_status_check;
alter table public.scheduled_communications
  add constraint scheduled_communications_status_check
  check (status in (
    'scheduled', 'processing', 'awaiting_approval', 'sent', 'failed', 'cancelled'
  ));

-- Universal client ↔ property ↔ enquiry ↔ conversation context.
-- Existing leads and listings remain the source records; this table records
-- the relationship between them without duplicating either entity.

create table if not exists public.property_enquiries (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  lead_id uuid not null references public.leads(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  source text not null default 'manual',
  external_enquiry_id text,
  status text not null default 'active'
    check (
      status in (
        'active',
        'contacted',
        'qualified',
        'inspection_booked',
        'inspected',
        'offer',
        'won',
        'lost',
        'closed'
      )
    ),
  assigned_to_user_id uuid references auth.users(id) on delete set null,
  first_enquired_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.property_enquiries is
  'Canonical relationship between one client and one property interest. A client may have many enquiries and a property may have many clients.';

create index if not exists property_enquiries_org_lead_idx
  on public.property_enquiries (org_id, lead_id, last_activity_at desc);
create index if not exists property_enquiries_org_listing_idx
  on public.property_enquiries (org_id, listing_id, last_activity_at desc);
create index if not exists property_enquiries_org_status_idx
  on public.property_enquiries (org_id, status, last_activity_at desc);
create unique index if not exists property_enquiries_external_source_idx
  on public.property_enquiries (org_id, source, external_enquiry_id)
  where external_enquiry_id is not null;

alter table public.property_enquiries enable row level security;

drop policy if exists "Members manage organisation property enquiries"
  on public.property_enquiries;
create policy "Members manage organisation property enquiries"
on public.property_enquiries
for all
to authenticated
using (
  exists (
    select 1
    from public.user_org_roles membership
    where membership.user_id = (select auth.uid())
      and membership.org_id = property_enquiries.org_id
  )
  and exists (
    select 1
    from public.leads client
    where client.id = property_enquiries.lead_id
      and client.org_id::text = property_enquiries.org_id
  )
  and (
    property_enquiries.listing_id is null
    or exists (
      select 1
      from public.listings property
      where property.id = property_enquiries.listing_id
        and property.org_id = property_enquiries.org_id
    )
  )
)
with check (
  exists (
    select 1
    from public.user_org_roles membership
    where membership.user_id = (select auth.uid())
      and membership.org_id = property_enquiries.org_id
  )
  and exists (
    select 1
    from public.leads client
    where client.id = property_enquiries.lead_id
      and client.org_id::text = property_enquiries.org_id
  )
  and (
    property_enquiries.listing_id is null
    or exists (
      select 1
      from public.listings property
      where property.id = property_enquiries.listing_id
        and property.org_id = property_enquiries.org_id
    )
  )
);

grant select, insert, update, delete
  on table public.property_enquiries to authenticated;
grant all privileges
  on table public.property_enquiries to service_role;

alter table public.conversations
  add column if not exists enquiry_id uuid,
  add column if not exists listing_id uuid,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'conversations_enquiry_id_fkey'
      and conrelid = 'public.conversations'::regclass
  ) then
    alter table public.conversations
      add constraint conversations_enquiry_id_fkey
      foreign key (enquiry_id)
      references public.property_enquiries(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'conversations_listing_id_fkey'
      and conrelid = 'public.conversations'::regclass
  ) then
    alter table public.conversations
      add constraint conversations_listing_id_fkey
      foreign key (listing_id)
      references public.listings(id)
      on delete set null;
  end if;
end
$$;

alter table public.conversations
  drop constraint if exists conversations_org_id_lead_id_channel_key;

create unique index if not exists conversations_unscoped_client_channel_idx
  on public.conversations (org_id, lead_id, channel)
  where enquiry_id is null;
create unique index if not exists conversations_enquiry_channel_idx
  on public.conversations (org_id, enquiry_id, channel)
  where enquiry_id is not null;
create index if not exists conversations_org_listing_idx
  on public.conversations (org_id, listing_id, last_message_at desc);

grant select, insert, update, delete
  on table public.conversations to authenticated;

alter table public.lead_identities
  add column if not exists external_id text,
  add column if not exists email_normalized text,
  add column if not exists phone_e164 text,
  add column if not exists facebook_psid text,
  add column if not exists instagram_id text,
  add column if not exists whatsapp_id text,
  add column if not exists domain_enquiry_id text,
  add column if not exists verified_at timestamptz;

update public.lead_identities
set email_normalized = lower(trim(email))
where email_normalized is null and nullif(trim(email), '') is not null;

update public.lead_identities
set phone_e164 = regexp_replace(phone, '[^0-9]', '', 'g')
where phone_e164 is null and nullif(regexp_replace(phone, '[^0-9]', '', 'g'), '') is not null;

create unique index if not exists lead_identities_org_email_key
  on public.lead_identities (org_id, email_normalized)
  where nullif(email_normalized, '') is not null;

create unique index if not exists lead_identities_org_facebook_key
  on public.lead_identities (org_id, facebook_psid)
  where nullif(facebook_psid, '') is not null;

create unique index if not exists lead_identities_org_whatsapp_key
  on public.lead_identities (org_id, whatsapp_id)
  where nullif(whatsapp_id, '') is not null;


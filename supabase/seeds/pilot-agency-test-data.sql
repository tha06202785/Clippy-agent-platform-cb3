-- Clippy pilot agency test dataset
-- Dataset: clippy-pilot-v1
-- Target: the dedicated Clippy QA Workspace only.
--
-- Safety properties:
--   * All people, addresses, email domains, and external IDs are synthetic.
--   * Every email uses the reserved, non-deliverable `.test` domain.
--   * No integration is created or connected.
--   * No outbound message is inserted.
--   * All scheduled communications are cancelled with zero attempts allowed.
--   * All automation approvals are rejected or expired.
--   * No message row is inserted because the live messages table has AI and
--     delivery network triggers.
--
-- This script is idempotent: deterministic IDs are upserted on every run.

do $pilot_seed$
declare
  qa_org constant uuid := '829d69df-9aae-4e40-a700-c97dced7509c';
  qa_user constant uuid := '829d69df-9aae-4e40-a700-c97dced7509c';
  dataset constant text := 'clippy-pilot-v1';
begin
  insert into public.orgs (
    id, name, plan, market_code, timezone, settings_json, platform_status,
    updated_at
  ) values (
    qa_org,
    'Clippy Pilot Agency (TEST)',
    'professional',
    'AU-VIC',
    'Australia/Melbourne',
    jsonb_build_object(
      'test_data_mode', true,
      'pilot_dataset', jsonb_build_object(
        'name', dataset,
        'version', 1,
        'mode', 'shadow',
        'outbound_enabled', false,
        'description', 'Synthetic Melbourne pilot agency dataset'
      )
    ),
    'active',
    now()
  )
  on conflict (id) do update set
    name = excluded.name,
    plan = excluded.plan,
    market_code = excluded.market_code,
    timezone = excluded.timezone,
    settings_json = coalesce(orgs.settings_json, '{}'::jsonb) || excluded.settings_json,
    platform_status = excluded.platform_status,
    updated_at = excluded.updated_at;

  -- Keep the QA workspace independent from paid-plan catalogue drift. This
  -- enables draft-only Copilot testing without granting any channel or
  -- outbound automation entitlement.
  insert into public.org_entitlement_overrides (
    id, org_id, feature_key, enabled, monthly_limit, reason, expires_at,
    created_by
  ) values (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001',
    qa_org,
    'copilot_chat',
    true,
    250,
    'Clippy pilot test dataset: approval-controlled Copilot testing only.',
    now() + interval '180 days',
    qa_user
  )
  on conflict (org_id, feature_key) do update set
    enabled = excluded.enabled,
    monthly_limit = excluded.monthly_limit,
    reason = excluded.reason,
    expires_at = excluded.expires_at,
    created_by = excluded.created_by;

  insert into public.profiles (
    user_id, full_name, is_onboarded, updated_at
  ) values (
    qa_user, 'Clippy Pilot Owner (TEST)', true, now()
  )
  on conflict (user_id) do update set
    full_name = excluded.full_name,
    is_onboarded = excluded.is_onboarded,
    updated_at = excluded.updated_at;

  insert into public.onboarding_progress (
    org_id, current_phase, completed_phases, profile_completed,
    integrations_completed, import_completed, knowledge_built,
    time_spent_seconds, integrations_connected, documents_uploaded,
    knowledge_items, completed_at, updated_at
  ) values (
    qa_org,
    'pilot_test_ready',
    '["welcome","agency","profile","test_data"]'::jsonb,
    true,
    false,
    true,
    false,
    900,
    0,
    0,
    0,
    now(),
    now()
  )
  on conflict (org_id) do update set
    current_phase = excluded.current_phase,
    completed_phases = excluded.completed_phases,
    profile_completed = excluded.profile_completed,
    integrations_completed = excluded.integrations_completed,
    import_completed = excluded.import_completed,
    knowledge_built = excluded.knowledge_built,
    time_spent_seconds = excluded.time_spent_seconds,
    integrations_connected = excluded.integrations_connected,
    documents_uploaded = excluded.documents_uploaded,
    knowledge_items = excluded.knowledge_items,
    completed_at = excluded.completed_at,
    updated_at = excluded.updated_at;

  insert into public.leads (
    id, org_id, primary_channel, source, status, stage, full_name, email,
    phone, created_at, last_contact_at, buyer_type, notes,
    assigned_to_user_id, external_id, ai_score, priority, last_activity_at,
    source_data
  ) values
    (
      '11111111-1111-4111-8111-111111111101', qa_org, 'email', 'email',
      'qualified', 'qualified', 'James Taylor',
      'james.taylor@example.test', null, now() - interval '6 days',
      now() - interval '2 days', 'owner_occupier',
      'Synthetic buyer seeking a family home near Richmond schools.', qa_user,
      dataset || '-lead-james', 91, 'hot', now() - interval '2 hours',
      jsonb_build_object('test_data', true, 'dataset', dataset, 'persona', 'hot_buyer')
    ),
    (
      '11111111-1111-4111-8111-111111111102', qa_org, 'website', 'website',
      'new', 'inquiry', 'Priya Nair', 'priya.nair@example.test', null,
      now() - interval '5 days', null, 'renter',
      'Synthetic renter requesting a Saturday inspection.', qa_user,
      dataset || '-lead-priya', 68, 'warm', now() - interval '8 hours',
      jsonb_build_object('test_data', true, 'dataset', dataset, 'persona', 'renter')
    ),
    (
      '11111111-1111-4111-8111-111111111103', qa_org, 'manual', 'referral',
      'contacted', 'contacted', 'Mia Chen', 'mia.chen@example.test', null,
      now() - interval '4 days', now() - interval '1 day', 'seller',
      'Synthetic seller asking for an appraisal and campaign plan.', qa_user,
      dataset || '-lead-mia', 74, 'warm', now() - interval '1 day',
      jsonb_build_object('test_data', true, 'dataset', dataset, 'persona', 'seller')
    ),
    (
      '11111111-1111-4111-8111-111111111104', qa_org, 'facebook', 'facebook',
      'qualified', 'qualified', 'Daniel Brooks',
      'daniel.brooks@example.test', null, now() - interval '4 days',
      now() - interval '20 hours', 'investor',
      'Synthetic investor comparing two apartments.', qa_user,
      dataset || '-lead-daniel', 82, 'hot', now() - interval '20 hours',
      jsonb_build_object('test_data', true, 'dataset', dataset, 'persona', 'investor')
    ),
    (
      '11111111-1111-4111-8111-111111111105', qa_org, 'whatsapp', 'whatsapp',
      'contacted', 'contacted', 'Sophie Williams',
      'sophie.williams@example.test', null, now() - interval '3 days',
      now() - interval '9 hours', 'renter',
      'Synthetic renter who requires a follow-up after an inspection.', qa_user,
      dataset || '-lead-sophie', 57, 'normal', now() - interval '9 hours',
      jsonb_build_object('test_data', true, 'dataset', dataset, 'persona', 'follow_up')
    ),
    (
      '11111111-1111-4111-8111-111111111106', qa_org, 'email', 'email',
      'qualified', 'qualified', 'Noah Patel', 'noah.patel@example.test', null,
      now() - interval '2 days', now() - interval '4 hours', 'first_home_buyer',
      'Synthetic first-home buyer ready to book an inspection.', qa_user,
      dataset || '-lead-noah', 88, 'hot', now() - interval '4 hours',
      jsonb_build_object('test_data', true, 'dataset', dataset, 'persona', 'first_home_buyer')
    )
  on conflict (id) do update set
    org_id = excluded.org_id,
    primary_channel = excluded.primary_channel,
    source = excluded.source,
    status = excluded.status,
    stage = excluded.stage,
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    last_contact_at = excluded.last_contact_at,
    buyer_type = excluded.buyer_type,
    notes = excluded.notes,
    assigned_to_user_id = excluded.assigned_to_user_id,
    external_id = excluded.external_id,
    ai_score = excluded.ai_score,
    priority = excluded.priority,
    last_activity_at = excluded.last_activity_at,
    source_data = excluded.source_data;

  insert into public.lead_identities (
    id, org_id, lead_id, channel, email, external_id, email_normalized,
    facebook_psid, verified_at
  ) values
    ('12111111-1111-4111-8111-111111111101', qa_org::text, '11111111-1111-4111-8111-111111111101', 'email', 'james.taylor@example.test', dataset || '-identity-james', 'james.taylor@example.test', dataset || '-facebook-james', now()),
    ('12111111-1111-4111-8111-111111111103', qa_org::text, '11111111-1111-4111-8111-111111111102', 'website', 'priya.nair@example.test', dataset || '-identity-priya', 'priya.nair@example.test', null, now()),
    ('12111111-1111-4111-8111-111111111104', qa_org::text, '11111111-1111-4111-8111-111111111103', 'manual', 'mia.chen@example.test', dataset || '-identity-mia', 'mia.chen@example.test', null, now()),
    ('12111111-1111-4111-8111-111111111105', qa_org::text, '11111111-1111-4111-8111-111111111104', 'facebook', 'daniel.brooks@example.test', dataset || '-identity-daniel', 'daniel.brooks@example.test', dataset || '-facebook-daniel', now()),
    ('12111111-1111-4111-8111-111111111106', qa_org::text, '11111111-1111-4111-8111-111111111105', 'whatsapp', 'sophie.williams@example.test', dataset || '-identity-sophie', 'sophie.williams@example.test', null, now()),
    ('12111111-1111-4111-8111-111111111107', qa_org::text, '11111111-1111-4111-8111-111111111106', 'email', 'noah.patel@example.test', dataset || '-identity-noah', 'noah.patel@example.test', null, now())
  on conflict (id) do update set
    org_id = excluded.org_id,
    lead_id = excluded.lead_id,
    channel = excluded.channel,
    email = excluded.email,
    external_id = excluded.external_id,
    email_normalized = excluded.email_normalized,
    facebook_psid = excluded.facebook_psid,
    verified_at = excluded.verified_at;

  insert into public.listings (
    id, org_id, address, price, status, created_at, bedrooms, bathrooms,
    parking, property_type, description, stage
  ) values
    ('22222222-2222-4222-8222-222222222201', qa_org::text, '12 Test Street, Richmond VIC 3121', 1250000, 'active', now() - interval '14 days', 4, 2, 2, 'house', 'Synthetic family home used only for the Clippy pilot dataset.', 'qualified'),
    ('22222222-2222-4222-8222-222222222202', qa_org::text, '88 Sample Road, South Yarra VIC 3141', 780000, 'active', now() - interval '12 days', 2, 2, 1, 'apartment', 'Synthetic inner-city apartment used only for QA.', 'inquiry'),
    ('22222222-2222-4222-8222-222222222203', qa_org::text, '24 Demo Lane, Carlton VIC 3053', 950000, 'active', now() - interval '10 days', 3, 2, 1, 'townhouse', 'Synthetic townhouse used for inspection and follow-up scenarios.', 'contacted'),
    ('22222222-2222-4222-8222-222222222204', qa_org::text, '5 Pilot Place, Brunswick VIC 3056', 680000, 'active', now() - interval '8 days', 2, 1, 1, 'apartment', 'Synthetic first-home-buyer listing used only for QA.', 'proposal')
  on conflict (id) do update set
    org_id = excluded.org_id,
    address = excluded.address,
    price = excluded.price,
    status = excluded.status,
    bedrooms = excluded.bedrooms,
    bathrooms = excluded.bathrooms,
    parking = excluded.parking,
    property_type = excluded.property_type,
    description = excluded.description,
    stage = excluded.stage;

  insert into public.property_enquiries (
    id, org_id, lead_id, listing_id, source, external_enquiry_id, status,
    assigned_to_user_id, first_enquired_at, last_activity_at, metadata,
    updated_at
  ) values
    ('33333333-3333-4333-8333-333333333301', qa_org::text, '11111111-1111-4111-8111-111111111101', '22222222-2222-4222-8222-222222222201', 'email', dataset || '-enquiry-1', 'qualified', qa_user, now() - interval '6 days', now() - interval '2 hours', jsonb_build_object('test_data', true, 'dataset', dataset, 'scenario', 'hot_buyer'), now()),
    ('33333333-3333-4333-8333-333333333302', qa_org::text, '11111111-1111-4111-8111-111111111102', '22222222-2222-4222-8222-222222222203', 'website', dataset || '-enquiry-2', 'inspection_booked', qa_user, now() - interval '5 days', now() - interval '8 hours', jsonb_build_object('test_data', true, 'dataset', dataset, 'scenario', 'inspection_request'), now()),
    ('33333333-3333-4333-8333-333333333303', qa_org::text, '11111111-1111-4111-8111-111111111103', null, 'manual', dataset || '-enquiry-3', 'contacted', qa_user, now() - interval '4 days', now() - interval '1 day', jsonb_build_object('test_data', true, 'dataset', dataset, 'scenario', 'seller_appraisal'), now()),
    ('33333333-3333-4333-8333-333333333304', qa_org::text, '11111111-1111-4111-8111-111111111104', '22222222-2222-4222-8222-222222222202', 'facebook', dataset || '-enquiry-4', 'qualified', qa_user, now() - interval '4 days', now() - interval '20 hours', jsonb_build_object('test_data', true, 'dataset', dataset, 'scenario', 'investor'), now()),
    ('33333333-3333-4333-8333-333333333305', qa_org::text, '11111111-1111-4111-8111-111111111104', '22222222-2222-4222-8222-222222222204', 'facebook', dataset || '-enquiry-5', 'active', qa_user, now() - interval '3 days', now() - interval '18 hours', jsonb_build_object('test_data', true, 'dataset', dataset, 'scenario', 'multi_property'), now()),
    ('33333333-3333-4333-8333-333333333306', qa_org::text, '11111111-1111-4111-8111-111111111105', '22222222-2222-4222-8222-222222222203', 'whatsapp', dataset || '-enquiry-6', 'inspected', qa_user, now() - interval '3 days', now() - interval '9 hours', jsonb_build_object('test_data', true, 'dataset', dataset, 'scenario', 'post_inspection_follow_up'), now()),
    ('33333333-3333-4333-8333-333333333307', qa_org::text, '11111111-1111-4111-8111-111111111106', '22222222-2222-4222-8222-222222222204', 'email', dataset || '-enquiry-7', 'inspection_booked', qa_user, now() - interval '2 days', now() - interval '4 hours', jsonb_build_object('test_data', true, 'dataset', dataset, 'scenario', 'first_home_buyer'), now())
  on conflict (id) do update set
    org_id = excluded.org_id,
    lead_id = excluded.lead_id,
    listing_id = excluded.listing_id,
    source = excluded.source,
    external_enquiry_id = excluded.external_enquiry_id,
    status = excluded.status,
    assigned_to_user_id = excluded.assigned_to_user_id,
    first_enquired_at = excluded.first_enquired_at,
    last_activity_at = excluded.last_activity_at,
    metadata = excluded.metadata,
    updated_at = excluded.updated_at;

  insert into public.conversations (
    id, org_id, lead_id, channel, created_at, last_message_at,
    external_thread_id, enquiry_id, listing_id, updated_at
  ) values
    ('44444444-4444-4444-8444-444444444401', qa_org::text, '11111111-1111-4111-8111-111111111101', 'email', now() - interval '6 days', now() - interval '2 hours', dataset || '-thread-1', '33333333-3333-4333-8333-333333333301', '22222222-2222-4222-8222-222222222201', now()),
    ('44444444-4444-4444-8444-444444444402', qa_org::text, '11111111-1111-4111-8111-111111111102', 'website', now() - interval '5 days', now() - interval '8 hours', dataset || '-thread-2', '33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222203', now()),
    ('44444444-4444-4444-8444-444444444403', qa_org::text, '11111111-1111-4111-8111-111111111103', 'manual', now() - interval '4 days', now() - interval '1 day', dataset || '-thread-3', '33333333-3333-4333-8333-333333333303', null, now()),
    ('44444444-4444-4444-8444-444444444404', qa_org::text, '11111111-1111-4111-8111-111111111104', 'facebook', now() - interval '4 days', now() - interval '20 hours', dataset || '-thread-4', '33333333-3333-4333-8333-333333333304', '22222222-2222-4222-8222-222222222202', now()),
    ('44444444-4444-4444-8444-444444444405', qa_org::text, '11111111-1111-4111-8111-111111111104', 'facebook', now() - interval '3 days', now() - interval '18 hours', dataset || '-thread-5', '33333333-3333-4333-8333-333333333305', '22222222-2222-4222-8222-222222222204', now()),
    ('44444444-4444-4444-8444-444444444406', qa_org::text, '11111111-1111-4111-8111-111111111105', 'whatsapp', now() - interval '3 days', now() - interval '9 hours', dataset || '-thread-6', '33333333-3333-4333-8333-333333333306', '22222222-2222-4222-8222-222222222203', now()),
    ('44444444-4444-4444-8444-444444444407', qa_org::text, '11111111-1111-4111-8111-111111111106', 'email', now() - interval '2 days', now() - interval '4 hours', dataset || '-thread-7', '33333333-3333-4333-8333-333333333307', '22222222-2222-4222-8222-222222222204', now())
  on conflict (id) do update set
    org_id = excluded.org_id,
    lead_id = excluded.lead_id,
    channel = excluded.channel,
    last_message_at = excluded.last_message_at,
    external_thread_id = excluded.external_thread_id,
    enquiry_id = excluded.enquiry_id,
    listing_id = excluded.listing_id,
    updated_at = excluded.updated_at;

  insert into public.lead_events (
    id, org_id, lead_id, event_type, payload_json, created_at
  ) values
    ('13111111-1111-4111-8111-111111111101', qa_org::text, '11111111-1111-4111-8111-111111111101', 'enquiry_received', jsonb_build_object('test_data', true, 'dataset', dataset, 'channel', 'email'), now() - interval '6 days'),
    ('13111111-1111-4111-8111-111111111102', qa_org::text, '11111111-1111-4111-8111-111111111101', 'lead_qualified', jsonb_build_object('test_data', true, 'dataset', dataset, 'score', 91), now() - interval '2 days'),
    ('13111111-1111-4111-8111-111111111103', qa_org::text, '11111111-1111-4111-8111-111111111102', 'inspection_requested', jsonb_build_object('test_data', true, 'dataset', dataset), now() - interval '8 hours'),
    ('13111111-1111-4111-8111-111111111104', qa_org::text, '11111111-1111-4111-8111-111111111104', 'multi_property_enquiry', jsonb_build_object('test_data', true, 'dataset', dataset, 'property_count', 2), now() - interval '18 hours'),
    ('13111111-1111-4111-8111-111111111105', qa_org::text, '11111111-1111-4111-8111-111111111105', 'inspection_follow_up_due', jsonb_build_object('test_data', true, 'dataset', dataset), now() - interval '9 hours')
  on conflict (id) do update set
    org_id = excluded.org_id,
    lead_id = excluded.lead_id,
    event_type = excluded.event_type,
    payload_json = excluded.payload_json,
    created_at = excluded.created_at;

  insert into public.inspection_time_slots (
    id, org_id, listing_id, starts_at, ends_at, capacity, booking_count,
    inspection_type, address, status, updated_at
  ) values
    ('55555555-5555-4555-8555-555555555501', qa_org::text, '22222222-2222-4222-8222-222222222201', now() + interval '2 days', now() + interval '2 days 30 minutes', 10, 2, 'open', '12 Test Street, Richmond VIC 3121', 'published', now()),
    ('55555555-5555-4555-8555-555555555502', qa_org::text, '22222222-2222-4222-8222-222222222203', now() - interval '1 day', now() - interval '23 hours 30 minutes', 8, 0, 'open', '24 Demo Lane, Carlton VIC 3053', 'completed', now()),
    ('55555555-5555-4555-8555-555555555503', qa_org::text, '22222222-2222-4222-8222-222222222204', now() + interval '4 days', now() + interval '4 days 30 minutes', 6, 0, 'private', '5 Pilot Place, Brunswick VIC 3056', 'draft', now())
  on conflict (id) do update set
    org_id = excluded.org_id,
    listing_id = excluded.listing_id,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    capacity = excluded.capacity,
    booking_count = excluded.booking_count,
    inspection_type = excluded.inspection_type,
    address = excluded.address,
    status = excluded.status,
    updated_at = excluded.updated_at;

  insert into public.inspection_bookings (
    id, org_id, slot_id, listing_id, lead_id, conversation_id,
    booking_status, attendance_status, attendee_count, source_channel,
    cancelled_at, cancellation_reason, enquiry_id, calendar_sync_status,
    calendar_sync_error, confirmation_sent_at, updated_at
  ) values
    ('66666666-6666-4666-8666-666666666601', qa_org::text, '55555555-5555-4555-8555-555555555501', '22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111101', '44444444-4444-4444-8444-444444444401', 'confirmed', 'unknown', 2, 'email', null, null, '33333333-3333-4333-8333-333333333301', 'failed', 'Synthetic test booking: external Calendar sync intentionally disabled.', null, now()),
    ('66666666-6666-4666-8666-666666666602', qa_org::text, '55555555-5555-4555-8555-555555555502', '22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111102', '44444444-4444-4444-8444-444444444402', 'cancelled', 'unknown', 2, 'website', now() - interval '12 hours', 'Synthetic cancellation scenario.', '33333333-3333-4333-8333-333333333302', 'cancelled', null, null, now()),
    ('66666666-6666-4666-8666-666666666603', qa_org::text, '55555555-5555-4555-8555-555555555501', '22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111106', '44444444-4444-4444-8444-444444444407', 'confirmed', 'unknown', 1, 'email', null, null, '33333333-3333-4333-8333-333333333307', 'failed', 'Synthetic test booking: external Calendar sync intentionally disabled.', null, now())
  on conflict (id) do update set
    org_id = excluded.org_id,
    slot_id = excluded.slot_id,
    listing_id = excluded.listing_id,
    lead_id = excluded.lead_id,
    conversation_id = excluded.conversation_id,
    booking_status = excluded.booking_status,
    attendance_status = excluded.attendance_status,
    attendee_count = excluded.attendee_count,
    source_channel = excluded.source_channel,
    cancelled_at = excluded.cancelled_at,
    cancellation_reason = excluded.cancellation_reason,
    enquiry_id = excluded.enquiry_id,
    calendar_sync_status = excluded.calendar_sync_status,
    calendar_sync_error = excluded.calendar_sync_error,
    confirmation_sent_at = excluded.confirmation_sent_at,
    updated_at = excluded.updated_at;

  insert into public.scheduled_communications (
    id, org_id, lead_id, conversation_id, inspection_booking_id, type,
    channel, scheduled_for, status, idempotency_key, cancelled_at,
    attempt_count, max_attempts, last_error, updated_at
  ) values
    ('77777777-7777-4777-8777-777777777701', qa_org::text, '11111111-1111-4111-8111-111111111101', '44444444-4444-4444-8444-444444444401', '66666666-6666-4666-8666-666666666601', 'inspection_confirmation', 'email', now() + interval '5 minutes', 'cancelled', dataset || '-comm-1', now(), 0, 0, 'Synthetic test record: delivery disabled.', now()),
    ('77777777-7777-4777-8777-777777777702', qa_org::text, '11111111-1111-4111-8111-111111111101', '44444444-4444-4444-8444-444444444401', '66666666-6666-4666-8666-666666666601', 'inspection_reminder_24h', 'email', now() + interval '1 day', 'cancelled', dataset || '-comm-2', now(), 0, 0, 'Synthetic test record: delivery disabled.', now()),
    ('77777777-7777-4777-8777-777777777703', qa_org::text, '11111111-1111-4111-8111-111111111106', '44444444-4444-4444-8444-444444444407', '66666666-6666-4666-8666-666666666603', 'inspection_reminder_2h', 'email', now() + interval '1 day 22 hours', 'cancelled', dataset || '-comm-3', now(), 0, 0, 'Synthetic test record: delivery disabled.', now()),
    ('77777777-7777-4777-8777-777777777704', qa_org::text, '11111111-1111-4111-8111-111111111105', '44444444-4444-4444-8444-444444444406', null, 'post_inspection_follow_up', 'whatsapp', now() + interval '2 hours', 'cancelled', dataset || '-comm-4', now(), 0, 0, 'Synthetic test record: delivery disabled.', now())
  on conflict (id) do update set
    org_id = excluded.org_id,
    lead_id = excluded.lead_id,
    conversation_id = excluded.conversation_id,
    inspection_booking_id = excluded.inspection_booking_id,
    type = excluded.type,
    channel = excluded.channel,
    scheduled_for = excluded.scheduled_for,
    status = excluded.status,
    idempotency_key = excluded.idempotency_key,
    cancelled_at = excluded.cancelled_at,
    attempt_count = excluded.attempt_count,
    max_attempts = excluded.max_attempts,
    last_error = excluded.last_error,
    updated_at = excluded.updated_at;

  insert into public.automation_approvals (
    id, org_id, action_key, channel, recipient, subject, content, lead_id,
    conversation_id, confidence, reason, status, idempotency_key,
    requested_at, decided_at, decided_by_user_id, delivery_metadata,
    updated_at
  ) values
    ('88888888-8888-4888-8888-888888888801', qa_org, 'new_enquiry_reply', 'email', 'james.taylor@example.test', 'Re: Inspection request - 12 Test Street', 'Synthetic draft: Thanks James. I can help with an inspection time, subject to agent approval.', '11111111-1111-4111-8111-111111111101', '44444444-4444-4444-8444-444444444401', 0.94, 'Synthetic approval-control scenario; never deliver.', 'rejected', dataset || '-approval-1', now() - interval '90 minutes', now() - interval '60 minutes', qa_user, jsonb_build_object('test_data', true, 'dataset', dataset, 'delivery_disabled', true), now()),
    ('88888888-8888-4888-8888-888888888802', qa_org, 'booking_link_reply', 'email', 'priya.nair@example.test', 'Inspection options - 24 Demo Lane', 'Synthetic draft: Here are the available inspection options, pending agent approval.', '11111111-1111-4111-8111-111111111102', '44444444-4444-4444-8444-444444444402', 0.91, 'Synthetic expired approval scenario; never deliver.', 'expired', dataset || '-approval-2', now() - interval '10 hours', now() - interval '9 hours', qa_user, jsonb_build_object('test_data', true, 'dataset', dataset, 'delivery_disabled', true), now()),
    ('88888888-8888-4888-8888-888888888803', qa_org, 'no_response_follow_up', 'whatsapp', 'sophie.williams@example.test', null, 'Synthetic draft: Thanks for attending. Would you like the application steps?', '11111111-1111-4111-8111-111111111105', '44444444-4444-4444-8444-444444444406', 0.86, 'Synthetic rejected follow-up; never deliver.', 'rejected', dataset || '-approval-3', now() - interval '8 hours', now() - interval '7 hours', qa_user, jsonb_build_object('test_data', true, 'dataset', dataset, 'delivery_disabled', true), now())
  on conflict (id) do update set
    org_id = excluded.org_id,
    action_key = excluded.action_key,
    channel = excluded.channel,
    recipient = excluded.recipient,
    subject = excluded.subject,
    content = excluded.content,
    lead_id = excluded.lead_id,
    conversation_id = excluded.conversation_id,
    confidence = excluded.confidence,
    reason = excluded.reason,
    status = excluded.status,
    idempotency_key = excluded.idempotency_key,
    requested_at = excluded.requested_at,
    decided_at = excluded.decided_at,
    decided_by_user_id = excluded.decided_by_user_id,
    delivery_metadata = excluded.delivery_metadata,
    updated_at = excluded.updated_at;

  insert into public.ai_actions (
    id, org_id, lead_id, conversation_id, action_type, input_summary,
    output_summary, confidence, latency_ms, tokens_used, escalated,
    escalation_reason, created_at
  ) values
    ('99999999-9999-4999-8999-999999999901', qa_org, '11111111-1111-4111-8111-111111111101', '44444444-4444-4444-8444-444444444401', 'pilot_test_draft_reply', 'Inspection-time request for a synthetic Richmond listing.', 'Prepared an approval-required reply draft.', 0.94, 820, 310, false, null, now() - interval '90 minutes'),
    ('99999999-9999-4999-8999-999999999902', qa_org, '11111111-1111-4111-8111-111111111102', '44444444-4444-4444-8444-444444444402', 'pilot_test_book_inspection', 'Synthetic renter requested a Saturday inspection.', 'Recommended presenting available test slots.', 0.91, 760, 280, false, null, now() - interval '8 hours'),
    ('99999999-9999-4999-8999-999999999903', qa_org, '11111111-1111-4111-8111-111111111103', '44444444-4444-4444-8444-444444444403', 'pilot_test_escalate_appraisal', 'Synthetic seller requested pricing advice.', 'Escalated appraisal advice to a licensed agent.', 0.98, 640, 220, true, 'Pricing and appraisal advice requires human review.', now() - interval '1 day'),
    ('99999999-9999-4999-8999-999999999904', qa_org, '11111111-1111-4111-8111-111111111104', '44444444-4444-4444-8444-444444444404', 'pilot_test_multi_property_context', 'Synthetic investor asked about two properties.', 'Kept enquiry context separated by property.', 0.89, 910, 340, false, null, now() - interval '18 hours'),
    ('99999999-9999-4999-8999-999999999905', qa_org, '11111111-1111-4111-8111-111111111105', '44444444-4444-4444-8444-444444444406', 'pilot_test_follow_up', 'Synthetic post-inspection follow-up request.', 'Prepared an approval-required application follow-up.', 0.86, 700, 260, false, null, now() - interval '7 hours')
  on conflict (id) do update set
    org_id = excluded.org_id,
    lead_id = excluded.lead_id,
    conversation_id = excluded.conversation_id,
    action_type = excluded.action_type,
    input_summary = excluded.input_summary,
    output_summary = excluded.output_summary,
    confidence = excluded.confidence,
    latency_ms = excluded.latency_ms,
    tokens_used = excluded.tokens_used,
    escalated = excluded.escalated,
    escalation_reason = excluded.escalation_reason,
    created_at = excluded.created_at;

  insert into public.tasks (
    id, org_id, lead_id, type, title, description, due_at, status,
    listing_id, assigned_to_user_id
  ) values
    ('14111111-1111-4111-8111-111111111101', qa_org::text, '11111111-1111-4111-8111-111111111101', 'follow_up', 'Review James inspection draft', 'Synthetic task: review the approval-controlled email draft.', now() + interval '2 hours', 'pending', '22222222-2222-4222-8222-222222222201', qa_user),
    ('14111111-1111-4111-8111-111111111102', qa_org::text, '11111111-1111-4111-8111-111111111102', 'inspection', 'Confirm Priya inspection preference', 'Synthetic task: confirm attendee details without sending a message.', now() + interval '4 hours', 'pending', '22222222-2222-4222-8222-222222222203', qa_user),
    ('14111111-1111-4111-8111-111111111103', qa_org::text, '11111111-1111-4111-8111-111111111103', 'appraisal', 'Prepare Mia appraisal review', 'Synthetic task requiring licensed-agent review.', now() + interval '1 day', 'pending', null, qa_user),
    ('14111111-1111-4111-8111-111111111104', qa_org::text, '11111111-1111-4111-8111-111111111104', 'research', 'Compare Daniel property enquiries', 'Synthetic multi-property context task.', now() + interval '6 hours', 'pending', '22222222-2222-4222-8222-222222222202', qa_user),
    ('14111111-1111-4111-8111-111111111105', qa_org::text, '11111111-1111-4111-8111-111111111105', 'follow_up', 'Review Sophie application follow-up', 'Synthetic task: approval required; delivery disabled.', now() + interval '3 hours', 'pending', '22222222-2222-4222-8222-222222222203', qa_user)
  on conflict (id) do update set
    org_id = excluded.org_id,
    lead_id = excluded.lead_id,
    type = excluded.type,
    title = excluded.title,
    description = excluded.description,
    due_at = excluded.due_at,
    status = excluded.status,
    listing_id = excluded.listing_id,
    assigned_to_user_id = excluded.assigned_to_user_id;

  insert into public.clippy_activity_log (
    id, org_id, user_id, action, category, title, description, metadata,
    impact_summary, started_at, completed_at, created_at
  ) values
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', qa_org, qa_user, 'pilot_test_dataset_loaded', 'test', 'Pilot test dataset loaded', 'Synthetic agency, clients, properties, enquiries and safe workflow records were prepared.', jsonb_build_object('test_data', true, 'dataset', dataset), 'QA workspace ready for controlled pilot testing', now() - interval '30 minutes', now() - interval '29 minutes', now() - interval '29 minutes'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02', qa_org, qa_user, 'pilot_test_identity_resolved', 'test', 'Cross-channel identity resolved', 'James Taylor is represented by email and Facebook identities mapped to one synthetic lead.', jsonb_build_object('test_data', true, 'dataset', dataset, 'lead_id', '11111111-1111-4111-8111-111111111101'), 'Duplicate-contact scenario prepared without duplicate client data', now() - interval '28 minutes', now() - interval '27 minutes', now() - interval '27 minutes'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03', qa_org, qa_user, 'pilot_test_multi_property_context', 'test', 'Multi-property context prepared', 'Daniel Brooks has two separate synthetic property enquiries.', jsonb_build_object('test_data', true, 'dataset', dataset), 'Conversation-to-property context can be tested safely', now() - interval '26 minutes', now() - interval '25 minutes', now() - interval '25 minutes'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa04', qa_org, qa_user, 'pilot_test_booking_simulated', 'test', 'Inspection booking simulated', 'Synthetic bookings were created with external Calendar sync intentionally failed or cancelled.', jsonb_build_object('test_data', true, 'dataset', dataset, 'delivery_disabled', true), 'Booking UI can be tested without external Calendar writes', now() - interval '24 minutes', now() - interval '23 minutes', now() - interval '23 minutes'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa05', qa_org, qa_user, 'pilot_test_approval_guard_verified', 'test', 'Approval guard represented', 'Synthetic approvals are rejected or expired and cannot be delivered.', jsonb_build_object('test_data', true, 'dataset', dataset, 'outbound_enabled', false), 'Draft-and-approve safety state prepared', now() - interval '22 minutes', now() - interval '21 minutes', now() - interval '21 minutes')
  on conflict (id) do update set
    org_id = excluded.org_id,
    user_id = excluded.user_id,
    action = excluded.action,
    category = excluded.category,
    title = excluded.title,
    description = excluded.description,
    metadata = excluded.metadata,
    impact_summary = excluded.impact_summary,
    started_at = excluded.started_at,
    completed_at = excluded.completed_at,
    created_at = excluded.created_at;
end
$pilot_seed$;

-- Verification summary. All sendable-outbound counts must remain zero.
with target as (
  select '829d69df-9aae-4e40-a700-c97dced7509c'::text as org_id
)
select
  (select name from public.orgs o, target t where o.id::text = t.org_id) as agency,
  (select count(*) from public.leads l, target t where l.org_id::text = t.org_id and l.source_data->>'dataset' = 'clippy-pilot-v1') as leads,
  (select count(*) from public.listings l, target t where l.org_id::text = t.org_id and l.description ilike '%synthetic%') as listings,
  (select count(*) from public.property_enquiries e, target t where e.org_id = t.org_id and e.metadata->>'dataset' = 'clippy-pilot-v1') as enquiries,
  (select count(*) from public.conversations c, target t where c.org_id = t.org_id and c.external_thread_id like 'clippy-pilot-v1-%') as conversations,
  (select count(*) from public.messages m, target t where m.org_id = t.org_id and m.raw_json->>'dataset' = 'clippy-pilot-v1') as inbound_messages,
  (select count(*) from public.inspection_bookings b, target t where b.org_id = t.org_id and coalesce(b.calendar_sync_error, b.cancellation_reason, '') ilike '%synthetic%') as bookings,
  (select count(*) from public.tasks x, target t where x.org_id = t.org_id and x.description ilike '%synthetic%') as tasks,
  (select count(*) from public.messages m, target t where m.org_id = t.org_id and m.direction_in_out = 'out' and m.raw_json->>'dataset' = 'clippy-pilot-v1') as dataset_outbound_messages,
  (select count(*) from public.scheduled_communications s, target t where s.org_id = t.org_id and s.idempotency_key like 'clippy-pilot-v1-%' and s.status in ('scheduled','processing','awaiting_approval')) as sendable_scheduled_communications,
  (select count(*) from public.automation_approvals a, target t where a.org_id::text = t.org_id and a.idempotency_key like 'clippy-pilot-v1-%' and a.status = 'pending') as pending_approvals,
  (select count(*) from public.integrations i, target t where i.org_id::text = t.org_id and i.status in ('connected','healthy')) as connected_integrations,
  (select enabled from public.org_entitlement_overrides e, target t where e.org_id::text = t.org_id and e.feature_key = 'copilot_chat') as copilot_override_enabled,
  (select monthly_limit from public.org_entitlement_overrides e, target t where e.org_id::text = t.org_id and e.feature_key = 'copilot_chat') as copilot_override_limit;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SQL = [
  'CREATE TABLE IF NOT EXISTS "inspection_time_slots" ( "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY, "org_id" UUID REFERENCES "orgs"("id") NOT NULL, "listing_id" UUID REFERENCES "listings"("id") NOT NULL, "starts_at" TIMESTAMPTZ NOT NULL, "ends_at" TIMESTAMPTZ NOT NULL, "timezone" TEXT DEFAULT 'Australia/Sydney', "inspection_type" TEXT DEFAULT 'open_home', "capacity" INTEGER DEFAULT 10, "booking_count" INTEGER DEFAULT 0, "status" TEXT DEFAULT 'published', "location_notes" TEXT, "host_user_id" UUID, "created_at" TIMESTAMPTZ DEFAULT NOW(), "updated_at" TIMESTAMPTZ DEFAULT NOW() )',
  'CREATE TABLE IF NOT EXISTS "inspection_bookings" ( "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY, "org_id" UUID REFERENCES "orgs"("id") NOT NULL, "slot_id" UUID REFERENCES "inspection_time_slots"("id"), "listing_id" UUID REFERENCES "listings"("id") NOT NULL, "lead_id" UUID REFERENCES "leads"("id") NOT NULL, "conversation_id" UUID, "booking_status" TEXT DEFAULT 'reserved', "attendance_status" TEXT DEFAULT 'unknown', "attendee_count" INTEGER DEFAULT 1, "confirmation_sent_at" TIMESTAMPTZ, "cancelled_at" TIMESTAMPTZ, "cancellation_reason" TEXT, "checked_in_at" TIMESTAMPTZ, "source_channel" TEXT, "created_at" TIMESTAMPTZ DEFAULT NOW(), "updated_at" TIMESTAMPTZ DEFAULT NOW() )',
  'CREATE TABLE IF NOT EXISTS "rental_applications" ( "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY, "org_id" UUID REFERENCES "orgs"("id") NOT NULL, "listing_id" UUID REFERENCES "listings"("id") NOT NULL, "lead_id" UUID REFERENCES "leads"("id") NOT NULL, "inspection_booking_id" UUID REFERENCES "inspection_bookings"("id"), "external_provider" TEXT, "external_application_id" TEXT, "application_url" TEXT, "status" TEXT DEFAULT 'not_started', "submitted_at" TIMESTAMPTZ, "reviewed_at" TIMESTAMPTZ, "decision_recorded_by" UUID, "created_at" TIMESTAMPTZ DEFAULT NOW(), "updated_at" TIMESTAMPTZ DEFAULT NOW() )',
  'CREATE TABLE IF NOT EXISTS "scheduled_communications" ( "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY, "org_id" UUID REFERENCES "orgs"("id") NOT NULL, "lead_id" UUID REFERENCES "leads"("id"), "conversation_id" UUID, "inspection_booking_id" UUID REFERENCES "inspection_bookings"("id"), "type" TEXT NOT NULL, "channel" TEXT NOT NULL, "scheduled_for" TIMESTAMPTZ NOT NULL, "status" TEXT DEFAULT 'scheduled', "attempt_count" INTEGER DEFAULT 0, "max_attempts" INTEGER DEFAULT 3, "idempotency_key" TEXT, "sent_at" TIMESTAMPTZ, "cancelled_at" TIMESTAMPTZ, "last_error" TEXT, "created_at" TIMESTAMPTZ DEFAULT NOW(), "updated_at" TIMESTAMPTZ DEFAULT NOW() )',
  'CREATE TABLE IF NOT EXISTS "lead_channel_preferences" ( "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY, "org_id" UUID REFERENCES "orgs"("id") NOT NULL, "lead_id" UUID REFERENCES "leads"("id") NOT NULL, "email_consent" BOOLEAN DEFAULT true, "sms_consent" BOOLEAN DEFAULT true, "whatsapp_consent" BOOLEAN DEFAULT true, "phone_consent" BOOLEAN DEFAULT true, "transactional_allowed" BOOLEAN DEFAULT true, "marketing_allowed" BOOLEAN DEFAULT false, "preferred_channel" TEXT DEFAULT 'email', "quiet_hours_start" TEXT, "quiet_hours_end" TEXT, "opted_out_at" TIMESTAMPTZ, "created_at" TIMESTAMPTZ DEFAULT NOW(), "updated_at" TIMESTAMPTZ DEFAULT NOW() )',
];

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== "Bearer clippy_migrate_2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results = [];
  for (const sql of SQL) {
    try {
      const { error } = await supabase.rpc("exec_sql", { query: sql });
      results.push({ ok: !error, error: error?.message });
    } catch (e) {
      results.push({ ok: false, error: String(e) });
    }
  }

  return NextResponse.json({ results, ok: results.filter(r => r.ok).length });
}

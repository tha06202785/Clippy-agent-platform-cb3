import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAutomationPolicy } from "@/lib/automation-policy";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { findGoogleCalendarConflicts } from "@/lib/calendar-conflicts";

export const dynamic = "force-dynamic";

const schema = z.object({
  action_id: z.string().trim().min(1).max(120),
  listing_id: z.string().uuid(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  capacity: z.number().int().min(1).max(100).default(10),
  inspection_type: z.literal("open").default("open"),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid inspection slot" },
      { status: 400 },
    );
  const startsAt = new Date(parsed.data.starts_at);
  const endsAt = new Date(parsed.data.ends_at);
  if (startsAt <= new Date() || endsAt <= startsAt)
    return NextResponse.json(
      { error: "The inspection must have a valid future start and end time." },
      { status: 400 },
    );

  const { data: membership } = await supabase
    .from("user_org_roles")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership?.org_id)
    return NextResponse.json(
      { error: "No organisation is linked to this account." },
      { status: 409 },
    );

  const admin = createAdminClient();
  const policy = await getAutomationPolicy(admin, membership.org_id);
  if (policy.paused)
    return NextResponse.json(
      { error: "Clippy automation is paused in Controlled Autonomy settings." },
      { status: 409 },
    );
  if (policy.modes.inspection_slot_management === "off")
    return NextResponse.json(
      { error: "Inspection slot creation is turned off in Controlled Autonomy settings." },
      { status: 409 },
    );

  const { data: listing } = await admin
    .from("listings")
    .select("id,address")
    .eq("id", parsed.data.listing_id)
    .eq("org_id", membership.org_id)
    .maybeSingle();
  if (!listing)
    return NextResponse.json({ error: "The selected property is unavailable." }, { status: 404 });

  const auditPrefix = `agent_action:${parsed.data.action_id};`;
  const { data: existing } = await admin
    .from("ai_actions")
    .select("id,created_at,output_summary")
    .eq("org_id", membership.org_id)
    .eq("action_type", "inspection_slot_created")
    .like("input_summary", `${auditPrefix}%`)
    .limit(1)
    .maybeSingle();
  if (existing)
    return NextResponse.json({
      created: true,
      duplicate: true,
      audit_id: existing.id,
      created_at: existing.created_at,
    });

  const [slotConflictsResult, googleEventsResult] = await Promise.all([
    admin
      .from("inspection_time_slots")
      .select("id,starts_at,ends_at")
      .eq("org_id", membership.org_id)
      .neq("status", "cancelled")
      .lt("starts_at", parsed.data.ends_at)
      .gt("ends_at", parsed.data.starts_at)
      .limit(10),
    admin
      .from("knowledge_documents")
      .select("id,title,source_metadata")
      .eq("org_id", membership.org_id)
      .eq("user_id", user.id)
      .eq("source", "calendar")
      .eq("status", "indexed")
      .limit(250),
  ]);
  const conflicts = [
    ...(slotConflictsResult.data || []).map((conflict) => ({
      id: conflict.id,
      startsAt: conflict.starts_at,
      endsAt: conflict.ends_at,
      source: "clippy" as const,
      title: "Clippy inspection",
    })),
    ...findGoogleCalendarConflicts(
      googleEventsResult.data || [],
      parsed.data.starts_at,
      parsed.data.ends_at,
    ),
  ];
  if (conflicts.length)
    return NextResponse.json(
      {
        error: "A Clippy inspection or Google Calendar event now overlaps this time. Review the calendar and try again.",
        code: "calendar_conflict",
        conflicts,
      },
      { status: 409 },
    );

  const { data: slot, error: slotError } = await admin
    .from("inspection_time_slots")
    .insert({
      org_id: membership.org_id,
      listing_id: parsed.data.listing_id,
      starts_at: parsed.data.starts_at,
      ends_at: parsed.data.ends_at,
      capacity: parsed.data.capacity,
      inspection_type: parsed.data.inspection_type,
      address: listing.address,
      status: "published",
    })
    .select("id,listing_id,starts_at,ends_at,capacity,inspection_type,status")
    .single();
  if (slotError || !slot)
    return NextResponse.json(
      { error: "The inspection slot could not be created. Please try again." },
      { status: 500 },
    );

  const { data: audit } = await admin
    .from("ai_actions")
    .insert({
      org_id: membership.org_id,
      action_type: "inspection_slot_created",
      input_summary: `${auditPrefix}approved_by:${user.id};listing:${listing.id};`,
      output_summary: `Created slot ${slot.id} for ${listing.address} from ${slot.starts_at} to ${slot.ends_at}`,
      confidence: 1,
      escalated: false,
    })
    .select("id,created_at")
    .single();

  return NextResponse.json(
    { created: true, slot, audit_id: audit?.id || null, created_at: audit?.created_at },
    { status: 201 },
  );
}

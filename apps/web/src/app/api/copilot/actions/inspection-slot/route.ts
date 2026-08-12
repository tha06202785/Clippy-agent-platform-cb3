import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAutomationPolicy } from "@/lib/automation-policy";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  findCalendarConflicts,
  normaliseGoogleCalendarEvents,
} from "@/lib/calendar-conflicts";

export const dynamic = "force-dynamic";

const timeSchema = z.object({
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
});
const schema = z.object({
  action_id: z.string().trim().min(1).max(120),
  listing_id: z.string().uuid(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  slots: z.array(timeSchema).min(1).max(10).optional(),
  capacity: z.number().int().min(1).max(100).default(10),
  inspection_type: z.literal("open").default("open"),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid inspection slots" },
      { status: 400 },
    );

  const requestedSlots = parsed.data.slots || [{
    starts_at: parsed.data.starts_at,
    ends_at: parsed.data.ends_at,
  }];
  const now = Date.now();
  const ordered = requestedSlots
    .map((slot) => ({
      ...slot,
      start: new Date(slot.starts_at).getTime(),
      end: new Date(slot.ends_at).getTime(),
    }))
    .sort((a, b) => a.start - b.start);
  if (ordered.some((slot) => slot.start <= now || slot.end <= slot.start))
    return NextResponse.json(
      { error: "Every inspection must have a valid future start and end time." },
      { status: 400 },
    );
  if (ordered.some((slot, index) => index > 0 && slot.start < ordered[index - 1].end))
    return NextResponse.json(
      { error: "Two requested inspection times overlap each other." },
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
  if (policy.paused || policy.modes.inspection_slot_management === "off")
    return NextResponse.json(
      { error: policy.paused ? "Clippy automation is paused." : "Inspection slot creation is turned off." },
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
    .select("id,created_at")
    .eq("org_id", membership.org_id)
    .eq("action_type", "inspection_slots_created")
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

  const earliest = ordered[0].starts_at;
  const latest = ordered[ordered.length - 1].ends_at;
  const [clippyResult, googleResult] = await Promise.all([
    admin
      .from("inspection_time_slots")
      .select("id,starts_at,ends_at")
      .eq("org_id", membership.org_id)
      .neq("status", "cancelled")
      .lt("starts_at", latest)
      .gt("ends_at", earliest)
      .limit(100),
    admin
      .from("knowledge_documents")
      .select("id,title,source_metadata")
      .eq("org_id", membership.org_id)
      .eq("user_id", user.id)
      .eq("source", "calendar")
      .eq("status", "indexed")
      .limit(250),
  ]);
  const busy = [
    ...(clippyResult.data || []).map((event) => ({
      id: event.id,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      source: "clippy" as const,
      title: "Clippy inspection",
    })),
    ...normaliseGoogleCalendarEvents(googleResult.data || []),
  ];
  const conflicts = ordered.flatMap((slot) =>
    findCalendarConflicts(busy, slot.starts_at, slot.ends_at),
  );
  if (conflicts.length)
    return NextResponse.json(
      {
        error: "One or more selected times are no longer available. Review the alternatives and try again.",
        code: "calendar_conflict",
        conflicts,
      },
      { status: 409 },
    );

  const { data: slots, error: slotError } = await admin
    .from("inspection_time_slots")
    .insert(ordered.map((slot) => ({
      org_id: membership.org_id,
      listing_id: parsed.data.listing_id,
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
      capacity: parsed.data.capacity,
      inspection_type: parsed.data.inspection_type,
      address: listing.address,
      status: "published",
    })))
    .select("id,listing_id,starts_at,ends_at,capacity,inspection_type,status");
  if (slotError || !slots?.length)
    return NextResponse.json(
      { error: "The inspection slots could not be created. Nothing was published." },
      { status: 500 },
    );

  const { data: audit } = await admin
    .from("ai_actions")
    .insert({
      org_id: membership.org_id,
      action_type: "inspection_slots_created",
      input_summary: `${auditPrefix}approved_by:${user.id};listing:${listing.id};count:${slots.length};`,
      output_summary: `Created ${slots.length} inspection slot(s) for ${listing.address}`,
      confidence: 1,
      escalated: false,
    })
    .select("id,created_at")
    .single();

  return NextResponse.json(
    { created: true, slots, slot: slots[0], audit_id: audit?.id || null, created_at: audit?.created_at },
    { status: 201 },
  );
}

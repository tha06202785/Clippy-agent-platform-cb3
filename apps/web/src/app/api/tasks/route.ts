import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const createTaskSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    due_at: z.string().datetime(),
    lead_id: z.string().uuid().optional(),
    listing_id: z.string().uuid().optional(),
  })
  .refine((value) => value.lead_id || value.listing_id, {
    message: "A client or property is required",
  });

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const { data: membership } = await supabase
    .from("user_org_roles")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership?.org_id) {
    return NextResponse.json(
      { error: "Organisation membership required" },
      { status: 403 },
    );
  }

  const parsed = createTaskSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid follow-up" },
      { status: 400 },
    );
  }

  const { lead_id: leadId, listing_id: listingId } = parsed.data;
  const [leadResult, listingResult] = await Promise.all([
    leadId
      ? supabase
          .from("leads")
          .select("id")
          .eq("id", leadId)
          .eq("org_id", membership.org_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    listingId
      ? supabase
          .from("listings")
          .select("id")
          .eq("id", listingId)
          .eq("org_id", membership.org_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if ((leadId && !leadResult.data) || (listingId && !listingResult.data)) {
    return NextResponse.json(
      { error: "The selected client or property is unavailable" },
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      org_id: membership.org_id,
      lead_id: leadId || null,
      listing_id: listingId || null,
      type: "follow_up",
      title: parsed.data.title,
      due_at: parsed.data.due_at,
      status: "pending",
    })
    .select("id,title,due_at,status")
    .single();

  if (error) {
    console.error("Follow-up creation failed", error.code);
    return NextResponse.json(
      { error: "Follow-up could not be created" },
      { status: 500 },
    );
  }

  return NextResponse.json(data, { status: 201 });
}

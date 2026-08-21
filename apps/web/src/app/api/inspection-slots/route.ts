import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createInspectionSlotSchema,
  updateInspectionSlotSchema,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get("listingId");

  let query = supabase
    .from("inspection_time_slots")
    .select("*, listings!inner(address, price)")
    .eq("org_id", membership.org_id);
  if (listingId) query = query.eq("listing_id", listingId);
  query = query.order("starts_at", { ascending: true });

  const { data: slots } = await query.limit(50);
  return NextResponse.json(slots || []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: orgMember } = await supabase
    .from("user_org_roles")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!orgMember?.org_id)
    return NextResponse.json(
      { error: "No organisation is linked to this account." },
      { status: 409 },
    );

  const parsed = createInspectionSlotSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid inspection slot" },
      { status: 400 },
    );

  const body = parsed.data;
  const { data: listing } = await supabase
    .from("listings")
    .select("id,address,price")
    .eq("id", body.listing_id)
    .eq("org_id", orgMember.org_id)
    .maybeSingle();
  if (!listing)
    return NextResponse.json(
      { error: "The selected property is unavailable." },
      { status: 404 },
    );

  const { data: conflicts, error: conflictError } = await supabase
    .from("inspection_time_slots")
    .select("id")
    .eq("org_id", orgMember.org_id)
    .eq("listing_id", body.listing_id)
    .neq("status", "cancelled")
    .lt("starts_at", body.ends_at)
    .gt("ends_at", body.starts_at)
    .limit(1);
  if (conflictError) {
    console.error("Inspection slot conflict check failed", {
      code: conflictError.code,
      message: conflictError.message,
    });
    return NextResponse.json(
      {
        error:
          "Clippy could not check the property calendar. Please try again.",
      },
      { status: 500 },
    );
  }
  if (conflicts?.length)
    return NextResponse.json(
      { error: "This property already has an inspection during that time." },
      { status: 409 },
    );

  const { data: slot, error } = await supabase
    .from("inspection_time_slots")
    .insert({
      org_id: orgMember.org_id,
      listing_id: body.listing_id,
      starts_at: body.starts_at,
      ends_at: body.ends_at,
      timezone: body.timezone,
      inspection_type: body.inspection_type,
      capacity: body.capacity,
      status: "published",
      location_notes: body.location_notes || null,
      address: listing.address,
    })
    .select()
    .single();

  if (error) {
    console.error("Inspection slot creation failed", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { error: "The inspection slot could not be created. Please try again." },
      { status: 500 },
    );
  }
  return NextResponse.json(
    { ...slot, listings: { address: listing.address, price: listing.price } },
    { status: 201 },
  );
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "Slot ID required" }, { status: 400 });

  const parsed = updateInspectionSlotSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid slot update" },
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

  const { data: slot, error } = await supabase
    .from("inspection_time_slots")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", membership.org_id)
    .select()
    .maybeSingle();
  if (error) {
    console.error("Inspection slot status update failed", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { error: "The inspection slot could not be updated." },
      { status: 500 },
    );
  }
  if (!slot)
    return NextResponse.json(
      { error: "Inspection slot not found." },
      { status: 404 },
    );
  return NextResponse.json(slot);
}

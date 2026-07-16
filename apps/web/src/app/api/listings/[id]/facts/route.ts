import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const { data: facts } = await supabase
    .from("listing_facts")
    .select("*")
    .eq("listing_id", id)
    .maybeSingle();

  return NextResponse.json(facts || {});
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const { data: facts, error } = await supabase
    .from("listing_facts")
    .upsert({
      listing_id: id,
      verified_price: body.verified_price || null,
      verified_bedrooms: body.verified_bedrooms || null,
      verified_bathrooms: body.verified_bathrooms || null,
      verified_land_size: body.verified_land_size || null,
      verified_building_size: body.verified_building_size || null,
      verified_inspection_times: body.verified_inspection_times || null,
      verified_availability: body.verified_availability || null,
      school_zones: body.school_zones || null,
      nearby_amenities: body.nearby_amenities || null,
      source: "agent",
      last_verified_at: new Date().toISOString(),
    }, { onConflict: "listing_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(facts);
}

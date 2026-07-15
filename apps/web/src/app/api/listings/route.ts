import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createListingSchema, validate } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Rate limit check
  const ip = await getClientIp();
  const { allowed, remaining, resetAt } = checkRateLimit(ip, "listings");
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in " + Math.ceil((resetAt - Date.now()) / 1000) + " seconds." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        },
      }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // org_members table may not exist — fall back to seed org
  let orgId: string | null = null;
  try {
    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .maybeSingle();
    orgId = orgMember?.org_id ?? null;
  } catch {
    // table may not exist
  }

  let query = supabase.from("listings").select("*").order("created_at", { ascending: false }).limit(50);
  if (orgId) {
    query = query.eq("org_id", orgId);
  } else {
    query = query.eq("org_id", "7f91a043-805b-4e67-83ab-36b14bf85898");
  }
  const { data: listings } = await query;
  return NextResponse.json(listings || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (!orgMember) {
      return NextResponse.json({ error: "No org found" }, { status: 400 });
    }

    const body = await req.json();
    const { data: newListing, error } = await supabase
      .from("listings")
      .insert({ ...body, org_id: orgMember.org_id })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(newListing, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

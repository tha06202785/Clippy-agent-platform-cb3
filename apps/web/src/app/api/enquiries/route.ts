import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const createEnquirySchema = z.object({
  lead_id: z.string().uuid(),
  listing_id: z.string().uuid().nullable().optional(),
  source: z.string().trim().min(1).max(50).default("manual"),
  external_enquiry_id: z.string().trim().max(255).nullable().optional(),
  status: z
    .enum([
      "active",
      "contacted",
      "qualified",
      "inspection_booked",
      "inspected",
      "offer",
      "won",
      "lost",
      "closed",
    ])
    .default("active"),
  metadata: z.record(z.unknown()).optional(),
});

async function authenticatedOrg() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, orgId: null };

  const { data: membership, error } = await supabase
    .from("user_org_roles")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return { supabase, user, orgId: membership?.org_id ?? null };
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, orgId } = await authenticatedOrg();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    let query = supabase
      .from("property_enquiries")
      .select(
        "*, leads(id,full_name,email,phone,stage,priority), listings(id,address,status,price), conversations(id,channel,last_message_at,external_thread_id)",
      )
      .eq("org_id", orgId)
      .order("last_activity_at", { ascending: false })
      .limit(100);

    const leadId = params.get("lead_id");
    const listingId = params.get("listing_id");
    if (leadId) query = query.eq("lead_id", leadId);
    if (listingId) query = query.eq("listing_id", listingId);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("Enquiry list failed", error);
    return NextResponse.json(
      { error: "Enquiries are unavailable" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, orgId } = await authenticatedOrg();
    if (!user || !orgId) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const parsed = createEnquirySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid enquiry" },
        { status: 400 },
      );
    }

    const leadRequest = supabase
      .from("leads")
      .select("id")
      .eq("id", parsed.data.lead_id)
      .eq("org_id", orgId)
      .maybeSingle();
    const listingRequest = parsed.data.listing_id
      ? supabase
          .from("listings")
          .select("id")
          .eq("id", parsed.data.listing_id)
          .eq("org_id", orgId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });
    const [leadResult, listingResult] = await Promise.all([
      leadRequest,
      listingRequest,
    ]);

    if (leadResult.error || !leadResult.data) {
      return NextResponse.json(
        { error: "Client does not belong to this organisation" },
        { status: 400 },
      );
    }
    if (
      parsed.data.listing_id &&
      (listingResult.error || !listingResult.data)
    ) {
      return NextResponse.json(
        { error: "Property does not belong to this organisation" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("property_enquiries")
      .insert({
        org_id: orgId,
        lead_id: parsed.data.lead_id,
        listing_id: parsed.data.listing_id ?? null,
        source: parsed.data.source,
        external_enquiry_id: parsed.data.external_enquiry_id ?? null,
        status: parsed.data.status,
        assigned_to_user_id: user.id,
        metadata: parsed.data.metadata ?? {},
        first_enquired_at: now,
        last_activity_at: now,
      })
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Enquiry creation failed", error);
    return NextResponse.json(
      { error: "Enquiry could not be created" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { completeInspectionBooking } from "@/lib/inspections/booking-automation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const tokenSchema = z.string().uuid();
const bookingSchema = z.object({
  slot_id: z.string().uuid(),
  attendee_count: z.number().int().min(1).max(10).default(1),
});

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] || null : value;
}

async function loadEnquiry(token: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("property_enquiries")
    .select(
      "id,org_id,lead_id,listing_id,status,metadata,leads(full_name),listings(address)",
    )
    .eq("booking_token", token)
    .in("status", ["active", "contacted", "qualified"])
    .maybeSingle();
  if (error) throw error;
  return { admin, enquiry: data };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    if (!tokenSchema.safeParse(token).success) {
      return NextResponse.json(
        { error: "Booking link is invalid" },
        { status: 404 },
      );
    }
    const { admin, enquiry } = await loadEnquiry(token);
    if (!enquiry?.listing_id) {
      return NextResponse.json(
        { error: "Inspection times are not available for this enquiry yet" },
        { status: 404 },
      );
    }
    const { data: slots, error } = await admin
      .from("inspection_time_slots")
      .select(
        "id,starts_at,ends_at,capacity,booking_count,inspection_type,address",
      )
      .eq("org_id", enquiry.org_id)
      .eq("listing_id", enquiry.listing_id)
      .eq("status", "published")
      .gt("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(30);
    if (error) throw error;

    const lead = one(enquiry.leads) as { full_name?: string | null } | null;
    const listing = one(enquiry.listings) as { address?: string | null } | null;
    return NextResponse.json({
      client_first_name: lead?.full_name?.split(/\s+/)[0] || null,
      property_address:
        listing?.address ||
        (typeof enquiry.metadata?.property_address === "string"
          ? enquiry.metadata.property_address
          : null),
      slots: (slots || []).filter((slot) => slot.booking_count < slot.capacity),
    });
  } catch (error) {
    console.error("Public inspection slots failed", error);
    return NextResponse.json(
      { error: "Inspection times are unavailable" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const ip = await getClientIp();
  const rate = checkRateLimit(ip, "/api/public/inspection-booking");
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Please wait before trying again" },
      { status: 429 },
    );
  }

  try {
    const { token } = await params;
    const parsedToken = tokenSchema.safeParse(token);
    const parsedBody = bookingSchema.safeParse(await req.json());
    if (!parsedToken.success || !parsedBody.success) {
      return NextResponse.json(
        { error: "Booking details are invalid" },
        { status: 400 },
      );
    }
    const { admin, enquiry } = await loadEnquiry(token);
    if (!enquiry?.listing_id) {
      return NextResponse.json(
        { error: "Booking link is unavailable" },
        { status: 404 },
      );
    }
    const { data, error } = await admin.rpc("reserve_public_inspection", {
      p_booking_token: token,
      p_slot_id: parsedBody.data.slot_id,
      p_attendee_count: parsedBody.data.attendee_count,
    });
    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Inspection could not be booked" },
        { status: 400 },
      );
    }
    const booking = Array.isArray(data) ? data[0] : data;
    const automation = await completeInspectionBooking({
      admin,
      orgId: enquiry.org_id,
      bookingId: booking.id,
      enquiryId: enquiry.id,
      origin: req.nextUrl.origin,
    });
    return NextResponse.json(
      {
        booking_id: booking.id,
        status: "confirmed",
        ...automation,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Public inspection booking failed", error);
    return NextResponse.json(
      { error: "Inspection could not be booked" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .from("automation_approvals")
    .select(
      "id,action_key,channel,recipient,subject,content,confidence,reason,status,requested_at,lead_id,conversation_id,inspection_booking_id,leads(full_name),inspection_bookings(listings(address))",
    )
    .eq("org_id", membership.org_id)
    .eq("status", "pending")
    .order("requested_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("Automation approvals could not be loaded", error.code);
    return NextResponse.json(
      { error: "Approvals could not be loaded" },
      { status: 500 },
    );
  }
  return NextResponse.json(data || []);
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get today's AI activity
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id, lead_stage")
      .gte("last_message_at", yesterday.toISOString());

    const { data: escalations } = await supabase
      .from("escalations")
      .select("id, severity")
      .gte("created_at", yesterday.toISOString())
      .eq("status", "pending");

    const { data: hotLeads } = await supabase
      .from("leads")
      .select("id, full_name, ai_score")
      .gte("last_contact_at", yesterday.toISOString())
      .eq("stage", "hot")
      .order("ai_score", { ascending: false })
      .limit(5);

    const { data: inspections } = await supabase
      .from("followup_queue")
      .select("id")
      .eq("action_type", "book_inspection")
      .eq("status", "sent")
      .gte("scheduled_for", yesterday.toISOString());

    const total = conversations?.length || 0;
    const hotCount = hotLeads?.length || 0;
    const escCount = escalations?.length || 0;
    const inspCount = inspections?.length || 0;

    // Save summary
    await supabase.from("ai_summaries").insert({
      org_id: "default",
      date: today.toISOString(),
      conversations_handled: total,
      inspections_booked: inspCount,
      hot_leads_identified: hotCount,
      escalations_count: escCount,
      pipeline_value: hotCount * 1000000,
      summary_text: "Good morning! Yesterday while you were offline: " + total + " conversations handled, " + inspCount + " inspections booked, " + hotCount + " hot buyers identified, " + escCount + " escalations awaiting review.",
    });

    return NextResponse.json({
      success: true,
      date: today.toISOString(),
      summary: {
        conversations_handled: total,
        inspections_booked: inspCount,
        hot_leads_identified: hotCount,
        escalations_count: escCount,
        pipeline_value: hotCount * 1000000,
      },
      hot_leads: hotLeads || [],
      message: "Good morning! Yesterday while you were offline: " + total + " conversations handled, " + inspCount + " inspections booked, " + hotCount + " hot buyers identified, " + escCount + " escalations awaiting review.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

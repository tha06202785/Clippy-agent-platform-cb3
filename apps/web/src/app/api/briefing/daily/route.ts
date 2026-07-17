import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: orgMember } = await supabase
      .from("org_members").select("org_id").eq("user_id", user.id).single();
    if (!orgMember) return NextResponse.json({ error: "No org" }, { status: 400 });

    const orgId = orgMember.org_id;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get yesterday's activity
    const { data: conversations } = await supabase
      .from("conversations").select("id, lead_stage")
      .eq("org_id", orgId)
      .gte("last_message_at", yesterday.toISOString())
      .lt("last_message_at", today.toISOString());

    const { data: messages } = await supabase
      .from("conversation_messages").select("id, role, ai_action, sentiment")
      .gte("created_at", yesterday.toISOString())
      .lt("created_at", today.toISOString());

    const { data: newLeads } = await supabase
      .from("leads").select("id, full_name, stage, ai_score, source")
      .eq("org_id", orgId)
      .gte("created_at", yesterday.toISOString())
      .lt("created_at", today.toISOString())
      .order("ai_score", { ascending: false });

    const { data: inspections } = await supabase
      .from("inspection_bookings").select("id, booking_status, attendance_status")
      .eq("org_id", orgId)
      .gte("created_at", yesterday.toISOString())
      .lt("created_at", today.toISOString());

    const { data: applications } = await supabase
      .from("rental_applications").select("id, status")
      .eq("org_id", orgId)
      .gte("created_at", yesterday.toISOString())
      .lt("created_at", today.toISOString());

    const { data: escalations } = await supabase
      .from("escalations").select("id, severity, reason")
      .eq("org_id", orgId)
      .gte("created_at", yesterday.toISOString())
      .lt("created_at", today.toISOString())
      .eq("status", "pending");

    const { data: hotLeads } = await supabase
      .from("leads").select("id, full_name, ai_score")
      .eq("org_id", orgId).eq("stage", "hot")
      .order("ai_score", { ascending: false }).limit(5);

    const { data: followups } = await supabase
      .from("followup_queue").select("id, action_type, status")
      .eq("org_id", orgId)
      .gte("created_at", yesterday.toISOString())
      .lt("created_at", today.toISOString());

    const totalConversations = conversations?.length || 0;
    const totalMessages = messages?.length || 0;
    const aiMessages = messages?.filter(m => m.role === "ai").length || 0;
    const leadMessages = messages?.filter(m => m.role === "lead").length || 0;
    const inspectionsBooked = inspections?.filter(i => i.booking_status === "confirmed").length || 0;
    const inspectionsAttended = inspections?.filter(i => i.attendance_status === "attended").length || 0;
    const applicationsSubmitted = applications?.filter(a => ["submitted","under_review"].includes(a.status)).length || 0;
    const pendingEscalations = escalations?.length || 0;
    const followupsSent = followups?.filter(f => f.status === "sent").length || 0;
    const hotCount = hotLeads?.length || 0;
    const pipelineValue = hotCount * 15000 + (newLeads?.filter(l => l.stage === "warm").length || 0) * 5000;

    let summary = "Good morning! ";
    if (totalConversations === 0) {
      summary += "It was a quiet day yesterday with no new conversations. ";
    } else {
      summary += "While you were offline, Clippy handled " + totalConversations + " conversations across " + totalMessages + " messages. ";
    }
    if (newLeads && newLeads.length > 0) {
      summary += newLeads.length + " new leads came in";
      const sources = [...new Set(newLeads.map(l => l.source))].filter(Boolean);
      if (sources.length > 0) summary += " via " + sources.join(", ");
      summary += ". ";
    }
    if (inspectionsBooked > 0) summary += inspectionsBooked + " inspections were booked. ";
    if (inspectionsAttended > 0) summary += inspectionsAttended + " inspections were attended. ";
    if (applicationsSubmitted > 0) summary += applicationsSubmitted + " rental applications were submitted. ";
    if (pendingEscalations > 0) summary += pendingEscalations + " items need your attention. ";
    if (hotCount > 0) summary += hotCount + " hot buyers identified. ";
    if (pipelineValue > 0) summary += "Estimated pipeline value: $" + pipelineValue.toLocaleString() + ". ";
    if (followupsSent > 0) summary += followupsSent + " automated follow-ups were sent. ";
    summary += "Have a productive day!";

    await supabase.from("ai_summaries").insert({
      org_id: orgId, date: today.toISOString(),
      conversations_handled: totalConversations,
      inspections_booked: inspectionsBooked,
      hot_leads_identified: hotCount,
      escalations_count: pendingEscalations,
      pipeline_value: pipelineValue,
      summary_text: summary,
    });

    return NextResponse.json({
      success: true, date: today.toISOString(), summary,
      metrics: {
        conversations_handled: totalConversations, messages_total: totalMessages,
        ai_messages: aiMessages, lead_messages: leadMessages,
        new_leads: newLeads?.length || 0, inspections_booked: inspectionsBooked,
        inspections_attended: inspectionsAttended, applications_submitted: applicationsSubmitted,
        pending_escalations: pendingEscalations, followups_sent: followupsSent,
        hot_leads: hotCount, pipeline_value: pipelineValue,
      },
      hot_leads: hotLeads || [], new_leads: newLeads || [], escalations: escalations || [],
    });
  } catch (error: any) {
    console.error("Briefing error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

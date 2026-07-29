import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function requireResult<T>(label: string, result: { data: T | null; error: { code?: string; message: string } | null }): T {
  if (result.error) throw new Error(label + ": " + (result.error.code || result.error.message));
  return result.data as T;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const membership = await supabase.from("user_org_roles").select("org_id").eq("user_id", user.id).limit(1).maybeSingle();
    if (membership.error) throw membership.error;
    if (!membership.data?.org_id) return NextResponse.json({ error: "No organisation" }, { status: 400 });

    const orgId = membership.data.org_id;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const from = yesterday.toISOString(), to = today.toISOString();

    const [conversationsResult, messagesResult, leadsResult, inspectionsResult, tasksResult] = await Promise.all([
      supabase.from("conversations").select("id").eq("org_id", orgId).gte("last_message_at", from).lt("last_message_at", to),
      supabase.from("messages").select("id, direction, sender_type").eq("org_id", orgId).gte("created_at", from).lt("created_at", to),
      supabase.from("leads").select("id, full_name, stage, ai_score, source").eq("org_id", orgId).gte("created_at", from).lt("created_at", to).order("ai_score", { ascending: false }),
      supabase.from("inspection_bookings").select("id, booking_status, attendance_status").eq("org_id", orgId).gte("created_at", from).lt("created_at", to),
      supabase.from("tasks").select("id, status").eq("org_id", orgId).gte("created_at", from).lt("created_at", to),
    ]);

    const conversations = requireResult("conversations", conversationsResult) || [];
    const messages = requireResult("messages", messagesResult) || [];
    const newLeads = requireResult("leads", leadsResult) || [];
    const inspections = requireResult("inspections", inspectionsResult) || [];
    const tasks = requireResult("tasks", tasksResult) || [];

    const inspectionsBooked = inspections.filter((i: any) => i.booking_status === "confirmed").length;
    const inspectionsAttended = inspections.filter((i: any) => i.attendance_status === "attended").length;
    const hotLeads = newLeads.filter((l: any) => l.stage === "hot" || Number(l.ai_score) >= 80).slice(0, 5);
    const followupsSent = tasks.filter((t: any) => t.status === "completed").length;
    const pipelineValue = hotLeads.length * 15000;

    const facts = [
      conversations.length ? `Clippy handled ${conversations.length} conversations across ${messages.length} messages.` : "No conversations were recorded yesterday.",
      newLeads.length ? `${newLeads.length} new leads arrived.` : "No new leads were recorded.",
      inspectionsBooked ? `${inspectionsBooked} inspections were booked.` : "",
      hotLeads.length ? `${hotLeads.length} high-priority leads need attention.` : "",
      followupsSent ? `${followupsSent} tasks were completed.` : "",
    ].filter(Boolean);
    const summary = "Good morning! " + facts.join(" ") + " Have a productive day!";

    const { error: saveError } = await supabase.from("ai_summaries").upsert({
      org_id: orgId, date: today.toISOString().slice(0, 10),
      conversations_handled: conversations.length, inspections_booked: inspectionsBooked,
      hot_leads_identified: hotLeads.length, escalations_count: 0,
      pipeline_value: pipelineValue, summary_text: summary,
    }, { onConflict: "org_id,date" });
    if (saveError) throw new Error("summary save: " + (saveError.code || saveError.message));

    return NextResponse.json({
      success: true, date: today.toISOString(), summary,
      metrics: {
        conversations_handled: conversations.length, messages_total: messages.length,
        new_leads: newLeads.length, inspections_booked: inspectionsBooked,
        inspections_attended: inspectionsAttended, pending_escalations: 0,
        followups_sent: followupsSent, hot_leads: hotLeads.length, pipeline_value: pipelineValue,
      },
      hot_leads: hotLeads, new_leads: newLeads,
    });
  } catch (error) {
    console.error("Briefing data unavailable", error);
    return NextResponse.json(
      { error: "Daily briefing is unavailable because its source data could not be verified." },
      { status: 503 },
    );
  }
}

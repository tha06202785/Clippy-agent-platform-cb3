import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 1. Process pending follow-ups
    const { data: jobs } = await supabase
      .from("followup_queue")
      .select("*, leads!inner(full_name, email, phone, stage), conversations!inner(channel)")
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .limit(10);

    let processed = 0;
    if (jobs) {
      for (const job of jobs) {
        try {
          const aiRes = await fetch("https://useclippy.com/api/ai/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orgId: job.org_id,
              channel: job.conversations?.channel || "email",
              leadId: job.lead_id,
              conversationId: job.conversation_id,
              message: "[SYSTEM: Follow-up triggered. Context: " + JSON.stringify(job.context || {}) + "]",
              metadata: { isFollowUp: true, actionType: job.action_type },
            }),
          });
          const aiData = await aiRes.json();
          await supabase.from("followup_queue").update({
            status: aiData.escalation ? "failed" : "sent",
            completed_at: new Date().toISOString(),
          }).eq("id", job.id);
          processed++;
        } catch {
          await supabase.from("followup_queue").update({
            status: "failed",
          }).eq("id", job.id);
        }
      }
    }

    // 2. Generate daily briefing
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

    const total = conversations?.length || 0;
    const hotCount = hotLeads?.length || 0;
    const escCount = escalations?.length || 0;

    await supabase.from("ai_summaries").insert({
      org_id: "default",
      date: today.toISOString(),
      conversations_handled: total,
      inspections_booked: 0,
      hot_leads_identified: hotCount,
      escalations_count: escCount,
      pipeline_value: hotCount * 1000000,
      summary_text: "Good morning! Yesterday: " + total + " conversations, " + hotCount + " hot buyers, " + escCount + " escalations. Follow-ups processed: " + processed + ".",
    });

    return NextResponse.json({
      success: true,
      followups_processed: processed,
      briefing: {
        conversations_handled: total,
        hot_leads_identified: hotCount,
        escalations_count: escCount,
      },
    });
  } catch (error: any) {
    console.error("Daily cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

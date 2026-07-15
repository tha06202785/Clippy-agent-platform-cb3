import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // Get pending follow-ups that are due
    const { data: jobs } = await supabase
      .from("followup_queue")
      .select("*, leads!inner(full_name, email, phone, stage), conversations!inner(channel)")
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .limit(10);

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    let processed = 0;
    for (const job of jobs) {
      try {
        // Generate follow-up message via AI
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

        // Mark as completed
        await supabase.from("followup_queue").update({
          status: aiData.escalation ? "failed" : "sent",
          completed_at: new Date().toISOString(),
        }).eq("id", job.id);

        processed++;
      } catch (err) {
        await supabase.from("followup_queue").update({
          status: "failed",
        }).eq("id", job.id);
      }
    }

    return NextResponse.json({ processed });
  } catch (error: any) {
    console.error("Follow-up cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

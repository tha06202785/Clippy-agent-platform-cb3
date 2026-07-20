import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: orgMember } = await supabase
      .from("user_org_roles").select("org_id").eq("user_id", user.id).single();
    if (!orgMember) return NextResponse.json({ error: "No org" }, { status: 400 });

    const orgId = orgMember.org_id;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    // Today's activity
    const { data: todayConversations } = await supabase
      .from("conversations").select("id, lead_stage")
      .eq("org_id", orgId).gte("last_message_at", today.toISOString());

    const { data: todayMessages } = await supabase
      .from("conversation_messages").select("id, role")
      .gte("created_at", today.toISOString());

    const { data: todayLeads } = await supabase
      .from("leads").select("id, stage, ai_score")
      .eq("org_id", orgId).gte("created_at", today.toISOString());

    const { data: todayInspections } = await supabase
      .from("inspection_bookings").select("id, booking_status")
      .eq("org_id", orgId).gte("created_at", today.toISOString());

    const { data: todayApplications } = await supabase
      .from("rental_applications").select("id, status")
      .eq("org_id", orgId).gte("created_at", today.toISOString());

    const { data: todayEscalations } = await supabase
      .from("escalations").select("id, severity")
      .eq("org_id", orgId).gte("created_at", today.toISOString())
      .eq("status", "pending");

    // Weekly metrics
    const { data: weekLeads } = await supabase
      .from("leads").select("id, stage, ai_score")
      .eq("org_id", orgId).gte("created_at", thisWeek.toISOString());

    const { data: weekInspections } = await supabase
      .from("inspection_bookings").select("id, booking_status, attendance_status")
      .eq("org_id", orgId).gte("created_at", thisWeek.toISOString());

    const { data: weekApplications } = await supabase
      .from("rental_applications").select("id, status")
      .eq("org_id", orgId).gte("created_at", thisWeek.toISOString());

    // Pipeline
    const { data: hotLeads } = await supabase
      .from("leads").select("id, ai_score")
      .eq("org_id", orgId).eq("stage", "hot");

    const { data: warmLeads } = await supabase
      .from("leads").select("id, ai_score")
      .eq("org_id", orgId).eq("stage", "warm");

    const { data: allLeads } = await supabase
      .from("leads").select("id, stage, ai_score")
      .eq("org_id", orgId);

    // Response time
    const { data: recentMessages } = await supabase
      .from("conversation_messages").select("created_at, role, conversation_id")
      .order("created_at", { ascending: false }).limit(100);

    let totalResponseTime = 0;
    let responseCount = 0;
    if (recentMessages) {
      for (let i = 0; i < recentMessages.length - 1; i++) {
        if (recentMessages[i].role === "ai" && recentMessages[i + 1]?.role === "lead") {
          const timeDiff = new Date(recentMessages[i].created_at).getTime() - new Date(recentMessages[i + 1].created_at).getTime();
          if (timeDiff > 0 && timeDiff < 300000) {
            totalResponseTime += timeDiff;
            responseCount++;
          }
        }
      }
    }
    const avgResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount / 1000) : 0;

    // Lead stage breakdown
    const byStage: Record<string, number> = {};
    if (allLeads) {
      for (const lead of allLeads) {
        const stage = lead.stage || "unknown";
        byStage[stage] = (byStage[stage] || 0) + 1;
      }
    }

    return NextResponse.json({
      now: {
        conversations_active: todayConversations?.length || 0,
        messages_today: todayMessages?.length || 0,
        ai_messages: todayMessages?.filter(m => m.role === "ai").length || 0,
        lead_messages: todayMessages?.filter(m => m.role === "lead").length || 0,
        new_leads_today: todayLeads?.length || 0,
        inspections_booked_today: todayInspections?.filter(i => i.booking_status === "confirmed").length || 0,
        applications_started_today: todayApplications?.filter(a => a.status !== "not_started").length || 0,
        pending_escalations: todayEscalations?.length || 0,
      },
      week: {
        new_leads: weekLeads?.length || 0,
        inspections_booked: weekInspections?.filter(i => i.booking_status === "confirmed").length || 0,
        inspections_attended: weekInspections?.filter(i => i.attendance_status === "attended").length || 0,
        inspections_no_show: weekInspections?.filter(i => i.attendance_status === "did_not_attend").length || 0,
        applications_submitted: weekApplications?.filter(a => ["submitted","under_review","approved"].includes(a.status)).length || 0,
        applications_approved: weekApplications?.filter(a => a.status === "approved").length || 0,
      },
      pipeline: {
        hot_leads: hotLeads?.length || 0,
        warm_leads: warmLeads?.length || 0,
        total_leads: allLeads?.length || 0,
        estimated_commission: ((hotLeads?.length || 0) * 15000) + ((warmLeads?.length || 0) * 5000),
        by_stage: byStage,
      },
      performance: {
        avg_response_time_seconds: avgResponseTime,
        response_rate: responseCount > 0 ? Math.round((responseCount / (todayMessages?.filter(m => m.role === "lead").length || 1)) * 100) : 0,
        ai_handled_percent: todayMessages && todayMessages.length > 0
          ? Math.round(((todayMessages.filter(m => m.role === "ai").length || 0) / todayMessages.length) * 100)
          : 0,
      },
    });
  } catch (error: any) {
    console.error("Principal dashboard error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Facebook webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === "clippy_verify_2026") {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Verification failed", { status: 403 });
}

// Incoming Facebook messages
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = await createClient();

    // Save raw webhook event
    await supabase.from("ai_actions").insert({
      org_id: "default",
      action_type: "webhook_received",
      input_summary: JSON.stringify(body).substring(0, 500),
      output_summary: "Facebook webhook received",
    });

    // Handle messaging events
    const entries = body.entry || [];
    for (const entry of entries) {
      const messaging = entry.messaging || [];
      for (const event of messaging) {
        const senderId = event.sender?.id;
        const message = event.message?.text;
        if (!senderId || !message) continue;

        // Resolve lead by Facebook PSID
        const { data: identity } = await supabase
          .from("lead_identities")
          .select("lead_id")
          .eq("facebook_psid", senderId)
          .maybeSingle();

        let leadId = identity?.lead_id;

        // Create lead if new
        if (!leadId) {
          const { data: lead } = await supabase.from("leads").insert({
            org_id: "default",
            full_name: null,
            source: "facebook",
            stage: "unknown",
          }).select().single();
          leadId = lead?.id;

          if (leadId) {
            await supabase.from("lead_identities").insert({
              org_id: "default", lead_id: leadId,
              channel: "facebook", facebook_psid: senderId,
            });
          }
        }

        // Send to AI brain
        if (leadId) {
          await fetch("https://useclippy.com/api/ai/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orgId: "default", channel: "facebook",
              leadId, message,
              externalId: event.message?.mid,
              externalConversationId: senderId,
            }),
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Facebook webhook error:", error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendMessage, trackDelivery } from "@/lib/channels/router";
import { registerFacebookChannel } from "@/lib/channels/facebook";

export const dynamic = "force-dynamic";

// Register Facebook channel on module load
registerFacebookChannel();

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

    // Save raw webhook event for replay
    await supabase.from("webhook_events").insert({
      channel: "facebook",
      event_type: "messaging",
      raw_payload: body,
      headers: Object.fromEntries(req.headers.entries()),
      processed: false,
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
          const aiRes = await fetch("https://useclippy.com/api/ai/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orgId: "default", channel: "facebook",
              leadId, message,
              externalId: event.message?.mid,
              externalConversationId: senderId,
            }),
          });
          const aiData = await aiRes.json();

          // Deliver reply back via Facebook
          if (aiData.reply && !aiData.paused && !aiData.optedOut) {
            const deliveryResult = await sendMessage("facebook", senderId, aiData.reply, {
              externalConversationId: senderId,
              leadId, conversationId: aiData.conversationId,
              orgId: "default",
            });

            // Track delivery
            if (aiData.conversationId) {
              await trackDelivery(supabase, deliveryResult, "facebook", aiData.conversationId, "default");
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Facebook webhook error:", error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendMessage, trackDelivery } from "@/lib/channels/router";
import { registerWhatsAppChannel } from "@/lib/channels/whatsapp";

export const dynamic = "force-dynamic";

registerWhatsAppChannel();

// WhatsApp webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === "clippy_wa_verify_2026") {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Verification failed", { status: 403 });
}

// Incoming WhatsApp messages
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = await createClient();

    // Save raw webhook event
    await supabase.from("webhook_events").insert({
      channel: "whatsapp",
      event_type: "message",
      raw_payload: body,
      headers: Object.fromEntries(req.headers.entries()),
      processed: false,
    });

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;
        const messages = value.messages || [];
        for (const msg of messages) {
          const from = msg.from; // sender phone number
          const text = msg.text?.body;
          if (!from || !text) continue;

          // Resolve lead by WhatsApp ID
          const { data: identity } = await supabase
            .from("lead_identities")
            .select("lead_id")
            .eq("whatsapp_id", from)
            .maybeSingle();

          let leadId = identity?.lead_id;

          if (!leadId) {
            const { data: lead } = await supabase.from("leads").insert({
              org_id: "default", full_name: null,
              source: "whatsapp", stage: "unknown",
            }).select().single();
            leadId = lead?.id;
            if (leadId) {
              await supabase.from("lead_identities").insert({
                org_id: "default", lead_id: leadId,
                channel: "whatsapp", whatsapp_id: from,
              });
            }
          }

          if (leadId) {
            const aiRes = await fetch("https://useclippy.com/api/ai/message", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orgId: "default", channel: "whatsapp",
                leadId, message: text,
                externalId: msg.id,
                externalConversationId: from,
              }),
            });
            const aiData = await aiRes.json();

            if (aiData.reply && !aiData.paused && !aiData.optedOut) {
              const deliveryResult = await sendMessage("whatsapp", from, aiData.reply, {
                externalConversationId: from,
                leadId, conversationId: aiData.conversationId,
                orgId: "default",
              });

              if (aiData.conversationId) {
                await trackDelivery(supabase, deliveryResult, "whatsapp", aiData.conversationId, "default");
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

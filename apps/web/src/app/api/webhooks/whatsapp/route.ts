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

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === "subscribe" && token && token === expectedToken) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Verification failed", { status: 403 });
}

// Resolve the org that owns a given WhatsApp Business Account phone_number_id
async function resolveOrgByWhatsAppPhoneNumberId(
  supabase: any,
  phoneNumberId: string
): Promise<string | null> {
  // Find integration where settings_json->>'whatsapp_phone_number_id' matches
  const { data: integration } = await supabase
    .from("integrations")
    .select("org_id, settings_json")
    .eq("provider", "whatsapp")
    .maybeSingle();

  if (!integration) return null;

  const settings = integration.settings_json || {};
  const storedPhoneNumberId =
    settings.whatsapp_phone_number_id ||
    settings.phone_number_id ||
    "";

  return storedPhoneNumberId === phoneNumberId ? integration.org_id : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = await createClient();

    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        const value = change.value;
        const messages = value.messages || [];

        // Resolve org once per change (same phone_number_id for all msgs in a change)
        const phoneNumberId = value.metadata?.phone_number_id || "";
        const resolvedOrgId =
          phoneNumberId
            ? await resolveOrgByWhatsAppPhoneNumberId(supabase, phoneNumberId)
            : null;

        // If no org resolved, use the first org as a fallback (for single-tenant setups)
        if (!resolvedOrgId) {
          const { data: orgs } = await supabase.from("orgs").select("id").limit(1);
          if (!orgs || orgs.length === 0) {
            console.warn("WhatsApp webhook: no org found, skipping");
            continue;
          }
          // Only use fallback org if there's exactly one — otherwise refuse
          if (orgs.length > 1) {
            console.error(
              "WhatsApp webhook: multiple orgs found, cannot route to default. Setup required."
            );
            continue;
          }
        }

        const orgId = resolvedOrgId || orgs![0].id;

        for (const msg of messages) {
          const from = msg.from; // sender phone in E.164
          const text = msg.text?.body;
          const msgId = msg.id;
          if (!from || !text) continue;

          // ── Idempotency: skip if this external_message_id already processed ──
          const { data: existingMsg } = await supabase
            .from("conversation_messages")
            .select("id")
            .eq("external_message_id", msgId)
            .maybeSingle();

          if (existingMsg) {
            // Already processed this message — acknowledge and skip
            continue;
          }

          // Save raw webhook event (async, don't await)
          supabase.from("webhook_events").insert({
            org_id: orgId,
            channel: "whatsapp",
            event_type: "message",
            raw_payload: body,
            headers: Object.fromEntries(req.headers.entries()),
            processed: false,
          });

          // Resolve lead by WhatsApp ID
          const { data: identity } = await supabase
            .from("lead_identities")
            .select("lead_id")
            .eq("whatsapp_id", from)
            .maybeSingle();

          let leadId = identity?.lead_id;

          if (!leadId) {
            const { data: lead } = await supabase
              .from("leads")
              .insert({
                org_id: orgId,
                full_name: null,
                source: "whatsapp",
                stage: "unknown",
              })
              .select()
              .single();
            leadId = lead?.id;

            if (leadId) {
              await supabase.from("lead_identities").insert({
                org_id: orgId,
                lead_id: leadId,
                channel: "whatsapp",
                whatsapp_id: from,
              });
            }
          }

          if (leadId) {
            const aiRes = await fetch(
              process.env.NEXT_PUBLIC_APP_URL + "/api/ai/message",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  channel: "whatsapp",
                  leadId,
                  message: text,
                  externalId: msgId,
                  externalConversationId: from,
                }),
              }
            );
            const aiData = await aiRes.json();

            if (aiData.reply && !aiData.paused && !aiData.optedOut) {
              const deliveryResult = await sendMessage(
                "whatsapp",
                from,
                aiData.reply,
                {
                  externalConversationId: from,
                  leadId,
                  conversationId: aiData.conversationId,
                  orgId,
                }
              );

              if (aiData.conversationId) {
                await trackDelivery(
                  supabase,
                  deliveryResult,
                  "whatsapp",
                  aiData.conversationId,
                  orgId
                );
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

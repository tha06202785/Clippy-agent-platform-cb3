import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { persistInboundMessage } from "@/lib/conversations/persist-inbound";
import { updateDeliveryStatus } from "@/lib/conversations/update-delivery-status";
import { resolveOrCreateLead } from "@/lib/leads/resolve-or-create";

export const dynamic = "force-dynamic";

function hasValidMetaSignature(rawBody: string, signature: string | null) {
  const appSecret =
    process.env.WHATSAPP_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
  if (!appSecret || !signature?.startsWith("sha256=")) return false;

  const provided = signature.slice("sha256=".length);
  if (!/^[a-f0-9]{64}$/i.test(provided)) return false;
  const expected = createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

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
  phoneNumberId: string,
): Promise<string | null> {
  const { data: integrations, error } = await supabase
    .from("integrations")
    .select("org_id, settings_json")
    .eq("provider", "whatsapp")
    .eq("status", "connected");

  if (error) throw error;
  const matches = (integrations || []).filter((candidate: any) => {
    const settings = candidate.settings_json || {};
    return (
      settings.whatsapp_phone_number_id === phoneNumberId ||
      settings.phone_number_id === phoneNumberId
    );
  });
  if (matches.length > 1)
    throw new Error("WhatsApp phone is linked to multiple agencies");
  return matches[0]?.org_id || null;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    if (
      !hasValidMetaSignature(rawBody, req.headers.get("x-hub-signature-256"))
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const supabase = createAdminClient();

    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        const value = change.value;
        const messages = value.messages || [];
        const statuses = value.statuses || [];
        if (!messages.length && !statuses.length) continue;

        // Resolve org once per change (same phone_number_id for all msgs in a change)
        const phoneNumberId = value.metadata?.phone_number_id || "";
        const resolvedOrgId = phoneNumberId
          ? await resolveOrgByWhatsAppPhoneNumberId(supabase, phoneNumberId)
          : null;

        if (!resolvedOrgId) {
          console.warn(
            "WhatsApp webhook: phone number is not linked to an org",
          );
          throw new Error("WhatsApp phone mapping is not ready");
        }

        const orgId = resolvedOrgId;

        for (const receipt of statuses) {
          if (!receipt.id || !receipt.status) continue;
          await updateDeliveryStatus({
            supabase,
            orgId,
            externalMessageId: receipt.id,
            status: receipt.status,
            timestamp: receipt.timestamp,
            error: receipt.errors?.[0]?.message || receipt.errors?.[0]?.title,
          });
        }

        for (const msg of messages) {
          const from = msg.from; // sender phone in E.164
          const text = msg.text?.body;
          const msgId = msg.id;
          if (!from || !text || !msgId) continue;

          const { data: event, error: eventError } = await supabase
            .from("webhook_events")
            .insert({
              org_id: orgId,
              channel: "whatsapp",
              event_type: "message",
              raw_payload: body,
              headers: Object.fromEntries(req.headers.entries()),
              processed: false,
            })
            .select("id")
            .single();
          if (eventError || !event)
            throw eventError || new Error("Could not record WhatsApp event");

          try {
            const leadId = await resolveOrCreateLead({
              supabase,
              orgId,
              channel: "whatsapp",
              identity: from,
              name: value.contacts?.find(
                (contact: any) => contact.wa_id === from,
              )?.profile?.name,
            });
            const result = await persistInboundMessage({
              supabase,
              orgId,
              leadId,
              channel: "whatsapp",
              externalThreadId: from,
              externalMessageId: msgId,
              text,
              rawPayload: msg,
            });
            const { error: processedError } = await supabase
              .from("webhook_events")
              .update({
                processed: true,
                processing_result: result.duplicate ? "duplicate" : "saved",
              })
              .eq("id", event.id)
              .eq("org_id", orgId);
            if (processedError) throw processedError;
            const { data: current, error: settingsError } = await supabase
              .from("integrations")
              .select("id,settings_json")
              .eq("org_id", orgId)
              .eq("provider", "whatsapp")
              .maybeSingle();
            if (settingsError) throw settingsError;
            if (current) {
              const { error: verifiedError } = await supabase
                .from("integrations")
                .update({
                  settings_json: {
                    ...current.settings_json,
                    whatsapp_inbound_verified_at: new Date().toISOString(),
                  },
                })
                .eq("id", current.id)
                .eq("org_id", orgId)
                .contains("settings_json", {
                  whatsapp_phone_number_id: phoneNumberId,
                });
              if (verifiedError) throw verifiedError;
            }
          } catch (error) {
            await supabase
              .from("webhook_events")
              .update({
                error_message:
                  "WhatsApp message processing failed; provider retry required",
              })
              .eq("id", event.id)
              .eq("org_id", orgId);
            throw error;
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("WhatsApp webhook processing failed; retry required");
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

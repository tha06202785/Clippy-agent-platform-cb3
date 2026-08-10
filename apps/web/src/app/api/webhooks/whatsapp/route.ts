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
  const { data: integrations } = await supabase
    .from("integrations")
    .select("org_id, settings_json")
    .eq("provider", "whatsapp")
    .eq("status", "connected");

  const integration = (integrations || []).find((candidate: any) => {
    const settings = candidate.settings_json || {};
    return (
      settings.whatsapp_phone_number_id === phoneNumberId ||
      settings.phone_number_id === phoneNumberId
    );
  });
  return integration?.org_id || null;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    if (
      !hasValidMetaSignature(rawBody, req.headers.get("x-hub-signature-256"))
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    const body = JSON.parse(rawBody);
    const supabase = createAdminClient();

    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        const value = change.value;
        const messages = value.messages || [];
        const statuses = value.statuses || [];

        // Resolve org once per change (same phone_number_id for all msgs in a change)
        const phoneNumberId = value.metadata?.phone_number_id || "";
        const resolvedOrgId = phoneNumberId
          ? await resolveOrgByWhatsAppPhoneNumberId(supabase, phoneNumberId)
          : null;

        if (!resolvedOrgId) {
          console.warn(
            "WhatsApp webhook: phone number is not linked to an org",
          );
          continue;
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
          if (!from || !text) continue;

          await supabase.from("webhook_events").insert({
            org_id: orgId,
            channel: "whatsapp",
            event_type: "message",
            raw_payload: body,
            headers: Object.fromEntries(req.headers.entries()),
            processed: false,
          });

          const leadId = await resolveOrCreateLead({
            supabase, orgId, channel: "whatsapp", identity: from,
          });

          if (leadId) {
            await persistInboundMessage({
              supabase, orgId, leadId, channel: "whatsapp",
              externalThreadId: from, externalMessageId: msgId,
              text, rawPayload: msg,
            });
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

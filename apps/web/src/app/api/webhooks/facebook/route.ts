import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendMessage, trackDelivery } from "@/lib/channels/router";
import { registerFacebookChannel } from "@/lib/channels/facebook";

export const dynamic = "force-dynamic";

registerFacebookChannel();

// Facebook webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.FACEBOOK_VERIFY_TOKEN;
  if (mode === "subscribe" && token && token === expectedToken) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Verification failed", { status: 403 });
}

// Resolve org by Facebook Page PSID
async function resolveOrgByFacebookPageId(
  supabase: any,
  pageId: string
): Promise<string | null> {
  const { data: integration } = await supabase
    .from("integrations")
    .select("org_id, settings_json")
    .eq("provider", "facebook")
    .maybeSingle();

  if (!integration) return null;

  const settings = integration.settings_json || {};
  const storedPageId = settings.facebook_page_id || settings.page_id || "";

  return storedPageId === pageId ? integration.org_id : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = await createClient();

    const entries = body.entry || [];

    for (const entry of entries) {
      // Each entry may cover multiple pages; get the pageScoped IDs
      const messaging = entry.messaging || [];

      // Resolve org from the first available page info in this entry
      const pageId =
        entry.id || // this is the page/scoped FB page ID
        "";

      const resolvedOrgId = pageId
        ? await resolveOrgByFacebookPageId(supabase, pageId)
        : null;

      // Fallback: use the first org if single-tenant
      let orgId = resolvedOrgId;
      if (!orgId) {
        const { data: fallbackOrgs } = await supabase.from("orgs").select("id").limit(1);
        if (!fallbackOrgs || fallbackOrgs.length === 0) {
          console.warn("Facebook webhook: no org found, skipping");
          continue;
        }
        if (fallbackOrgs.length > 1) {
          console.error(
            "Facebook webhook: multiple orgs found, cannot route to default. Setup required."
          );
          continue;
        }
        orgId = fallbackOrgs[0].id;
      }

      for (const event of messaging) {
        const senderId = event.sender?.id;
        const pageScopedSenderId = event.sender?.page_scoped_id || senderId;
        const message = event.message?.text;
        const msgId = event.message?.mid;
        if (!pageScopedSenderId || !message) continue;

        // ── Idempotency: skip if this mid already processed ──
        if (msgId) {
          const { data: existingMsg } = await supabase
            .from("conversation_messages")
            .select("id")
            .eq("external_message_id", msgId)
            .maybeSingle();

          if (existingMsg) {
            continue;
          }
        }

        // Save raw webhook event (async, don't await)
        supabase.from("webhook_events").insert({
          org_id: orgId,
          channel: "facebook",
          event_type: "messaging",
          raw_payload: body,
          headers: Object.fromEntries(req.headers.entries()),
          processed: false,
        });

        // Resolve lead by Facebook PSID
        const { data: identity } = await supabase
          .from("lead_identities")
          .select("lead_id")
          .eq("facebook_psid", pageScopedSenderId)
          .maybeSingle();

        let leadId = identity?.lead_id;

        // Create lead if new
        if (!leadId) {
          const { data: lead } = await supabase
            .from("leads")
            .insert({
              org_id: orgId,
              full_name: null,
              source: "facebook",
              stage: "unknown",
            })
            .select()
            .single();
          leadId = lead?.id;

          if (leadId) {
            await supabase.from("lead_identities").insert({
              org_id: orgId,
              lead_id: leadId,
              channel: "facebook",
              facebook_psid: pageScopedSenderId,
            });
          }
        }

        // Send to AI brain
        if (leadId) {
          const aiRes = await fetch(
            process.env.NEXT_PUBLIC_APP_URL + "/api/ai/message",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                channel: "facebook",
                leadId,
                message,
                externalId: msgId,
                externalConversationId: pageScopedSenderId,
              }),
            }
          );
          const aiData = await aiRes.json();

          // Deliver reply back via Facebook
          if (aiData.reply && !aiData.paused && !aiData.optedOut) {
            const deliveryResult = await sendMessage(
              "facebook",
              pageScopedSenderId,
              aiData.reply,
              {
                externalConversationId: pageScopedSenderId,
                leadId,
                conversationId: aiData.conversationId,
                orgId,
              }
            );

            if (aiData.conversationId) {
              await trackDelivery(
                supabase,
                deliveryResult,
                "facebook",
                aiData.conversationId,
                orgId
              );
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

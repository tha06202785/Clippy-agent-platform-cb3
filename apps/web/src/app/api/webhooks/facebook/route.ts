import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { persistInboundMessage } from "@/lib/conversations/persist-inbound";

export const dynamic = "force-dynamic";

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
  const { data: integrations } = await supabase
    .from("integrations")
    .select("org_id, settings_json")
    .eq("provider", "facebook")
    .eq("status", "connected");
  const integration = (integrations || []).find((candidate: any) => {
    const settings = candidate.settings_json || {};
    return (settings.facebook_page_id || settings.page_id || "") === pageId;
  });
  return integration?.org_id || null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createAdminClient();

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

      const orgId = resolvedOrgId;
      if (!orgId) {
        console.warn("Facebook webhook: page is not linked to an org");
        continue;
      }

      for (const event of messaging) {
        const senderId = event.sender?.id;
        const pageScopedSenderId = event.sender?.page_scoped_id || senderId;
        const message = event.message?.text;
        const msgId = event.message?.mid;
        if (!pageScopedSenderId || !message) continue;

        await supabase.from("webhook_events").insert({
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
          .eq("org_id", orgId)
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

        if (leadId) {
          await persistInboundMessage({
            supabase, orgId, leadId, channel: "facebook",
            externalThreadId: pageScopedSenderId,
            externalMessageId: msgId, text: message, rawPayload: event,
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

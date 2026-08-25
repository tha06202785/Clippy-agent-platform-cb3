import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMessage, trackDelivery } from "@/lib/channels/router";
import { registerEmailChannel } from "@/lib/channels/email";
import { resolveOrCreateLead } from "@/lib/leads/resolve-or-create";
import { readAutomationSecret } from "@/lib/automation-security";
import { shouldDeliverAutomatedAiReply } from "@/lib/ai/message-workflow";

export const dynamic = "force-dynamic";

registerEmailChannel();

// Receive incoming email via SendGrid Inbound Parse or similar
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const supabase = createAdminClient();

    const from = formData.get("from") as string;
    const text = formData.get("text") as string;
    const subject = formData.get("subject") as string;
    const to = formData.get("to") as string;

    if (!from || !text) {
      return NextResponse.json(
        { error: "from and text required" },
        { status: 400 },
      );
    }

    // Extract email from "Name <email>" format
    const emailMatch =
      from.match(/<([^>]+)>/) ||
      from.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const email = emailMatch ? emailMatch[1] || emailMatch[0] : from;

    // Resolve org from email
    const { data: integration } = await supabase
      .from("integrations")
      .select("org_id")
      .eq("channel", "email")
      .neq("settings_json", null)
      .limit(1)
      .single();
    const orgId =
      integration?.org_id ||
      (await supabase.from("orgs").select("id").limit(1).single()).data?.id;
    if (!orgId)
      return NextResponse.json({ error: "No org found" }, { status: 400 });

    // Save raw webhook event
    await supabase.from("webhook_events").insert({
      channel: "email",
      event_type: "inbound",
      raw_payload: Object.fromEntries(formData.entries()),
      headers: Object.fromEntries(req.headers.entries()),
      processed: false,
    });

    const leadId = await resolveOrCreateLead({
      supabase,
      orgId,
      channel: "email",
      identity: email,
    });

    if (leadId) {
      const internalSecret = readAutomationSecret("INTERNAL_API_SECRET");
      if (!internalSecret) {
        throw new Error("Internal AI automation is securely disabled");
      }
      const aiRes = await fetch("https://useclippy.com/api/ai/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": internalSecret,
        },
        body: JSON.stringify({
          orgId: orgId,
          channel: "email",
          leadId,
          message: text,
          metadata: { subject, email },
          externalConversationId: email,
        }),
      });
      const aiData = await aiRes.json();

      if (shouldDeliverAutomatedAiReply(aiData)) {
        const deliveryResult = await sendMessage("email", email, aiData.reply, {
          subject: "Re: " + (subject || "Your enquiry"),
          externalConversationId: email,
          leadId,
          conversationId: aiData.conversationId,
          orgId: orgId,
        });

        if (aiData.conversationId) {
          await trackDelivery(
            supabase,
            deliveryResult,
            "email",
            aiData.conversationId,
            orgId,
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Email webhook error:", error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

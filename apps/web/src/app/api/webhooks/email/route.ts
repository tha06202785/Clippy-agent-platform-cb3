import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendMessage, trackDelivery } from "@/lib/channels/router";
import { registerEmailChannel } from "@/lib/channels/email";

export const dynamic = "force-dynamic";

registerEmailChannel();

// Receive incoming email via SendGrid Inbound Parse or similar
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const supabase = await createClient();

    const from = formData.get("from") as string;
    const text = formData.get("text") as string;
    const subject = formData.get("subject") as string;
    const to = formData.get("to") as string;

    if (!from || !text) {
      return NextResponse.json({ error: "from and text required" }, { status: 400 });
    }

    // Extract email from "Name <email>" format
    const emailMatch = from.match(/<([^>]+)>/) || from.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const email = emailMatch ? emailMatch[1] || emailMatch[0] : from;

    // Save raw webhook event
    await supabase.from("webhook_events").insert({
      channel: "email",
      event_type: "inbound",
      raw_payload: Object.fromEntries(formData.entries()),
      headers: Object.fromEntries(req.headers.entries()),
      processed: false,
    });

    // Resolve lead by email
    const { data: identity } = await supabase
      .from("lead_identities")
      .select("lead_id")
      .eq("email_normalized", email.toLowerCase())
      .maybeSingle();

    let leadId = identity?.lead_id;

    if (!leadId) {
      const { data: lead } = await supabase.from("leads").insert({
        org_id: "default", full_name: null,
        email: email, source: "email", stage: "unknown",
      }).select().single();
      leadId = lead?.id;
      if (leadId) {
        await supabase.from("lead_identities").insert({
          org_id: "default", lead_id: leadId,
          channel: "email", email_normalized: email.toLowerCase(),
        });
      }
    }

    if (leadId) {
      const aiRes = await fetch("https://useclippy.com/api/ai/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: "default", channel: "email",
          leadId, message: text,
          metadata: { subject, email },
          externalConversationId: email,
        }),
      });
      const aiData = await aiRes.json();

      if (aiData.reply && !aiData.paused && !aiData.optedOut) {
        const deliveryResult = await sendMessage("email", email, aiData.reply, {
          subject: "Re: " + (subject || "Your enquiry"),
          externalConversationId: email,
          leadId, conversationId: aiData.conversationId,
          orgId: "default",
        });

        if (aiData.conversationId) {
          await trackDelivery(supabase, deliveryResult, "email", aiData.conversationId, "default");
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Email webhook error:", error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

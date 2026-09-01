import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordClippyActivity } from "@/lib/activity-log";
import { deliverApprovedMessage } from "@/lib/channels/deliver-approved-message";
import {
  isMessageVisible,
  messageRaw,
} from "@/lib/conversations/message-visibility";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const forwardSchema = z.object({
  recipient: z.string().trim().email().max(320),
  subject: z.string().trim().min(1).max(300),
  note: z.string().trim().max(2_000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const { id, messageId } = await params;
  if (
    !z.string().uuid().safeParse(id).success ||
    !z.string().uuid().safeParse(messageId).success
  ) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }
  const parsed = forwardSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid recipient and subject" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: membership } = await supabase
    .from("user_org_roles")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership?.org_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: conversation } = await admin
    .from("conversations")
    .select("id,channel,integration_account_id")
    .eq("id", id)
    .eq("org_id", membership.org_id)
    .maybeSingle();
  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }
  if (conversation.channel !== "email") {
    return NextResponse.json(
      { error: "Only email messages can be forwarded through Gmail" },
      { status: 409 },
    );
  }

  const { data: message, error: messageError } = await admin
    .from("messages")
    .select("id,text,created_at,raw_json")
    .eq("id", messageId)
    .eq("conversation_id", id)
    .eq("org_id", membership.org_id)
    .maybeSingle();
  if (messageError) throw messageError;
  if (!message || !isMessageVisible(message)) {
    return NextResponse.json(
      { error: "This message is no longer available to forward" },
      { status: 409 },
    );
  }

  const raw = messageRaw(message.raw_json);
  const forwardedBody = [
    parsed.data.note || "",
    "---------- Forwarded message ----------",
    raw.from ? `From: ${String(raw.from)}` : "",
    message.created_at
      ? `Date: ${new Date(message.created_at).toLocaleString("en-AU", {
          timeZone: "Australia/Melbourne",
        })}`
      : "",
    `Subject: ${parsed.data.subject}`,
    "",
    String(message.text || "(No text content)"),
  ]
    .filter((line, index) => line || index > 4)
    .join("\n")
    .trim();

  const delivery = await deliverApprovedMessage({
    admin,
    orgId: membership.org_id,
    channel: "email",
    recipient: parsed.data.recipient,
    content: forwardedBody,
    subject: parsed.data.subject,
    subjectMode: "forward",
    integrationAccountId: conversation.integration_account_id,
  });
  const now = new Date().toISOString();
  const priorForwards = Array.isArray(raw.forwarded_events)
    ? raw.forwarded_events.slice(-9)
    : [];
  await admin
    .from("messages")
    .update({
      raw_json: {
        ...raw,
        forwarded_events: [
          ...priorForwards,
          {
            forwarded_at: now,
            forwarded_by_user_id: user.id,
            recipient: parsed.data.recipient,
            external_message_id: delivery.externalId,
          },
        ],
      },
    })
    .eq("id", message.id)
    .eq("org_id", membership.org_id);

  await recordClippyActivity(admin, {
    orgId: membership.org_id,
    userId: user.id,
    action: "conversation_message_forwarded",
    category: "communication",
    title: "Email forwarded",
    description:
      "An agent-reviewed message was forwarded through connected Gmail.",
    impactSummary: "Email forwarded after explicit agent confirmation",
    metadata: {
      conversation_id: id,
      message_id: message.id,
      recipient: parsed.data.recipient,
      external_message_id: delivery.externalId,
    },
    completedAt: now,
  });

  return NextResponse.json({
    status: "forwarded",
    external_message_id: delivery.externalId,
  });
}

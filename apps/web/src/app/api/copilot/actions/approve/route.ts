import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { deliverApprovedMessage } from "@/lib/channels/deliver-approved-message";
import { recordApprovedCommunication } from "@/lib/adaptive-learning";

export const dynamic = "force-dynamic";

const approvalSchema = z.object({
  draft_id: z.string().trim().min(1).max(120),
  channel: z.enum(["email", "sms", "whatsapp", "facebook", "copy"]),
  subject: z.string().trim().max(300).nullable().optional(),
  content: z.string().trim().min(1).max(12_000),
  original_content: z.string().trim().min(1).max(12_000).optional(),
  lead_id: z.string().uuid().optional(),
  conversation_id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const parsed = approvalSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid approval" },
      { status: 400 },
    );
  }

  const { data: membership } = await supabase
    .from("user_org_roles")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership?.org_id) {
    return NextResponse.json(
      { error: "No organisation is linked to this account." },
      { status: 409 },
    );
  }

  let leadId = parsed.data.lead_id;
  let conversationRecipient: string | null = null;
  let conversationChannel: string | null = null;
  if (parsed.data.conversation_id) {
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id,lead_id,channel,external_thread_id")
      .eq("id", parsed.data.conversation_id)
      .eq("org_id", membership.org_id)
      .maybeSingle();
    if (!conversation) {
      return NextResponse.json(
        { error: "The selected conversation is unavailable." },
        { status: 404 },
      );
    }
    if (leadId && conversation.lead_id !== leadId) {
      return NextResponse.json(
        { error: "The selected client and conversation do not match." },
        { status: 400 },
      );
    }
    leadId = conversation.lead_id;
    conversationRecipient = conversation.external_thread_id;
    conversationChannel = conversation.channel;
  }

  let recipient: {
    name: string | null;
    email: string | null;
    phone: string | null;
  } = { name: null, email: null, phone: null };
  if (leadId) {
    const { data: client } = await supabase
      .from("leads")
      .select("full_name,email,phone")
      .eq("id", leadId)
      .eq("org_id", membership.org_id)
      .maybeSingle();
    if (!client) {
      return NextResponse.json(
        { error: "The selected client is unavailable." },
        { status: 404 },
      );
    }
    recipient = {
      name: client.full_name,
      email: client.email,
      phone: client.phone,
    };
  }
  if (parsed.data.channel === "whatsapp" && !recipient.phone) {
    recipient.phone = conversationRecipient;
  }
  if (parsed.data.channel === "facebook" && !conversationRecipient) {
    return NextResponse.json(
      { error: "This Facebook conversation has no recipient identifier." },
      { status: 400 },
    );
  }
  if (
    parsed.data.channel === "facebook" &&
    !["facebook", "facebook_messenger"].includes(conversationChannel || "")
  ) {
    return NextResponse.json(
      { error: "The selected channel does not match this conversation." },
      { status: 400 },
    );
  }
  if (
    parsed.data.channel === "whatsapp" &&
    conversationChannel !== "whatsapp"
  ) {
    return NextResponse.json(
      { error: "The selected channel does not match this conversation." },
      { status: 400 },
    );
  }

  if (parsed.data.channel === "email" && !recipient.email) {
    return NextResponse.json(
      { error: "This client does not have an email address." },
      { status: 400 },
    );
  }
  if (["sms", "whatsapp"].includes(parsed.data.channel) && !recipient.phone) {
    return NextResponse.json(
      { error: "This client does not have a phone number." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const approvalPrefix = `approval:${parsed.data.draft_id};`;
  const { data: existing } = await admin
    .from("ai_actions")
    .select("id,created_at")
    .eq("org_id", membership.org_id)
    .eq("action_type", `draft_approved_${parsed.data.channel}`)
    .like("input_summary", `${approvalPrefix}%`)
    .limit(1)
    .maybeSingle();

  if (existing && parsed.data.conversation_id) {
    const { data: delivered } = await admin
      .from("messages")
      .select("id,created_at,raw_json")
      .eq("org_id", membership.org_id)
      .eq("conversation_id", parsed.data.conversation_id)
      .contains("raw_json", { approval_id: existing.id })
      .limit(1)
      .maybeSingle();
    if (delivered) {
      return NextResponse.json({
        approved: true,
        sent: true,
        approval_id: existing.id,
        approved_at: existing.created_at,
        recipient,
        duplicate: true,
        message: delivered,
      });
    }
  } else if (existing) {
    return NextResponse.json({
      approved: true,
      sent: false,
      approval_id: existing.id,
      approved_at: existing.created_at,
      recipient,
      duplicate: true,
    });
  }

  const inputSummary = [
    approvalPrefix,
    `approved_by:${user.id};`,
    `subject:${parsed.data.subject || ""};`,
  ].join("");
  const approval =
    existing ||
    (
      await admin
        .from("ai_actions")
        .insert({
          org_id: membership.org_id,
          lead_id: leadId || null,
          conversation_id: parsed.data.conversation_id || null,
          action_type: `draft_approved_${parsed.data.channel}`,
          input_summary: inputSummary,
          output_summary: parsed.data.content,
          confidence: 1,
          escalated: false,
        })
        .select("id,created_at")
        .single()
    ).data;

  if (!approval) {
    console.error("Draft approval audit failed");
    return NextResponse.json(
      { error: "The draft could not be approved. Please try again." },
      { status: 500 },
    );
  }

  let adaptiveLearning: {
    learned: boolean;
    changed?: boolean;
    reason?: string;
  } | null = null;
  try {
    adaptiveLearning = await recordApprovedCommunication({
      supabase: admin,
      orgId: membership.org_id,
      userId: user.id,
      finalText: parsed.data.content,
      originalText: parsed.data.original_content || parsed.data.content,
      subject: parsed.data.subject,
      channel: parsed.data.channel,
      leadId,
      conversationId: parsed.data.conversation_id,
      sourceMessageId: approval.id,
      names: [recipient.name],
    });
  } catch (learningError) {
    // Learning must never prevent an approved client communication.
    console.error(
      "Adaptive communication learning failed",
      learningError instanceof Error ? learningError.message : learningError,
    );
  }

  const isDirectChannel = ["email", "facebook", "whatsapp"].includes(
    parsed.data.channel,
  );
  if (isDirectChannel && parsed.data.conversation_id) {
    try {
      const directRecipient =
        parsed.data.channel === "facebook"
          ? conversationRecipient
          : parsed.data.channel === "email"
            ? recipient.email
            : recipient.phone;
      if (!directRecipient) throw new Error("Recipient is unavailable");
      let emailSubject = parsed.data.subject || null;
      if (parsed.data.channel === "email" && !emailSubject) {
        const { data: latestInbound } = await admin
          .from("messages")
          .select("raw_json")
          .eq("org_id", membership.org_id)
          .eq("conversation_id", parsed.data.conversation_id)
          .eq("direction_in_out", "in")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        emailSubject =
          typeof latestInbound?.raw_json?.subject === "string"
            ? latestInbound.raw_json.subject
            : null;
      }
      const delivery = await deliverApprovedMessage({
        admin,
        orgId: membership.org_id,
        channel:
          parsed.data.channel === "facebook"
            ? "facebook"
            : parsed.data.channel === "email"
              ? "email"
              : "whatsapp",
        recipient: directRecipient,
        content: parsed.data.content,
        subject: emailSubject,
        threadId:
          parsed.data.channel === "email" ? conversationRecipient : null,
      });
      const sentAt = new Date().toISOString();
      const { data: sentMessage, error: messageError } = await admin
        .from("messages")
        .insert({
          org_id: membership.org_id,
          conversation_id: parsed.data.conversation_id,
          direction_in_out: "out",
          text: parsed.data.content,
          read_at: sentAt,
          raw_json: {
            channel: parsed.data.channel,
            approval_id: approval.id,
            external_message_id: delivery.externalId,
            delivery_status: "sent",
            adaptive_learning: adaptiveLearning?.learned === true,
            ...(parsed.data.channel === "email"
              ? {
                  gmail_thread_id: delivery.threadId || conversationRecipient,
                  subject: emailSubject,
                }
              : {}),
          },
        })
        .select("id,created_at,direction_in_out,text,read_at,raw_json")
        .single();
      if (messageError || !sentMessage)
        throw messageError || new Error("Delivery record failed");
      await admin
        .from("conversations")
        .update({ last_message_at: sentAt, updated_at: sentAt })
        .eq("id", parsed.data.conversation_id)
        .eq("org_id", membership.org_id);
      return NextResponse.json({
        approved: true,
        sent: true,
        approval_id: approval.id,
        approved_at: approval.created_at,
        recipient,
        duplicate: false,
        message: sentMessage,
        adaptive_learning: adaptiveLearning,
      });
    } catch (deliveryError) {
      console.error(
        "Approved message delivery failed",
        deliveryError instanceof Error ? deliveryError.message : deliveryError,
      );
      return NextResponse.json(
        {
          approved: true,
          sent: false,
          approval_id: approval.id,
          approved_at: approval.created_at,
          recipient,
          error:
            deliveryError instanceof Error
              ? deliveryError.message
              : "Channel delivery failed",
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({
    approved: true,
    sent: false,
    approval_id: approval.id,
    approved_at: approval.created_at,
    recipient,
    duplicate: false,
    adaptive_learning: adaptiveLearning,
  });
}

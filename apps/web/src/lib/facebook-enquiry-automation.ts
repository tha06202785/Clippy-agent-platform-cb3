import { createHmac, timingSafeEqual } from "node:crypto";
import { normaliseImportPhone } from "@/lib/crm-import-deduplication";
import { deliverApprovedMessage } from "@/lib/channels/deliver-approved-message";
import {
  evaluateAutomationAction,
  queueAutomationApproval,
} from "@/lib/automation-policy";
import { resolveAgentName } from "@/lib/inspections/booking-automation";

type AdminClient = any;

export type SharedContactDetails = {
  name: string | null;
  email: string | null;
  phone: string | null;
};

const OPT_OUT_PATTERN =
  /\b(?:stop|unsubscribe|do not (?:message|contact|call|email)|don't (?:message|contact|call|email)|no more messages)\b/i;
const SENSITIVE_PATTERN =
  /\b(?:make an? offer|accept(?:ed)? offer|counteroffer|negotiate|lowest price|contract|legal advice|conveyanc|finance approval|loan approval|guarantee|deposit dispute|bond dispute|discriminat)\b/i;

export function verifyFacebookWebhookSignature({
  rawBody,
  signature,
  appSecret,
}: {
  rawBody: string;
  signature: string | null;
  appSecret: string;
}) {
  if (!signature?.startsWith("sha256=") || !appSecret) return false;
  const supplied = signature.slice("sha256=".length);
  const expected = createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");
  if (supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export function containsMessagingOptOut(text: string) {
  return OPT_OUT_PATTERN.test(text);
}

export function isSensitivePropertyMessage(text: string) {
  return SENSITIVE_PATTERN.test(text);
}

export function extractSharedContactDetails(
  text: string,
): SharedContactDetails {
  const email =
    text
      .match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)?.[0]
      ?.toLowerCase() || null;
  const phoneCandidate = text.match(
    /(?:\+?61[\s.-]?(?:\(?0?\)?[2-8]|4)|0[2-8])(?:[\s().-]*\d){8}\b/,
  )?.[0];
  const normalisedPhone = phoneCandidate
    ? normaliseImportPhone(phoneCandidate)
    : "";
  const nameMatch = text.match(
    /\b(?:my name is|this is)\s+([A-Za-z][A-Za-z'’-]{1,39}(?:\s+[A-Za-z][A-Za-z'’-]{1,39}){0,2})\b/i,
  );

  return {
    name: nameMatch?.[1]?.trim() || null,
    email,
    phone:
      normalisedPhone && /^61[2-8]\d{8}$/.test(normalisedPhone)
        ? normalisedPhone
        : null,
  };
}

export function buildFacebookQualificationReply({
  agentName,
  automatedReplyCount,
  hasContactDetails,
}: {
  agentName: string;
  automatedReplyCount: number;
  hasContactDetails: boolean;
}) {
  const agentReference = agentName || "our team";
  const signature = agentName ? `\n\nKind regards,\n${agentName}` : "";

  if (hasContactDetails) {
    return `Thank you — I’ve saved the contact details you provided. ${agentReference} can follow up about your property enquiry. You can also continue here on Messenger.${signature}`;
  }

  if (automatedReplyCount > 0) {
    return `Thanks — that helps. If you’d like ${agentReference} to contact you directly, please send your preferred name and either a phone number or email address. You can continue here on Messenger if you prefer.${signature}`;
  }

  return `Thanks for your enquiry. Which suburbs and price range would suit you? If you’d like ${agentReference} to contact you directly, please also share your preferred name and either a phone number or email address. You can continue here on Messenger if you prefer.${signature}`;
}

async function saveSharedContactDetails({
  admin,
  orgId,
  leadId,
  details,
}: {
  admin: AdminClient;
  orgId: string;
  leadId: string;
  details: SharedContactDetails;
}) {
  if (!details.name && !details.email && !details.phone) return false;
  const sharedDirectContact = Boolean(details.email || details.phone);

  const { data: lead, error } = await admin
    .from("leads")
    .select("full_name,email,phone")
    .eq("id", leadId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (error) throw error;

  const updates: Record<string, string> = {};
  if (!lead?.full_name && details.name) updates.full_name = details.name;
  if (!lead?.email && details.email) updates.email = details.email;
  if (!lead?.phone && details.phone) updates.phone = details.phone;
  if (!Object.keys(updates).length) return sharedDirectContact;

  const now = new Date().toISOString();
  const update = await admin
    .from("leads")
    .update({
      ...updates,
      stage: "new",
      last_activity_at: now,
    })
    .eq("id", leadId)
    .eq("org_id", orgId);
  if (update.error) throw update.error;

  if (sharedDirectContact) {
    await admin.from("consent_events").insert({
      org_id: orgId,
      lead_id: leadId,
      channel: "facebook",
      consent_type: "direct_follow_up_details_shared",
      granted: true,
      user_agent: "facebook_messenger",
    });
  }
  return sharedDirectContact;
}

export async function handleFacebookEnquiryAutomation({
  admin,
  orgId,
  leadId,
  conversationId,
  recipient,
  pageId,
  inboundText,
  externalMessageId,
}: {
  admin: AdminClient;
  orgId: string;
  leadId: string;
  conversationId: string;
  recipient: string;
  pageId: string;
  inboundText: string;
  externalMessageId?: string | null;
}) {
  if (containsMessagingOptOut(inboundText)) {
    await admin.from("opt_outs").insert({
      org_id: orgId,
      lead_id: leadId,
      channel: "facebook",
      reason: "Client opted out in Messenger",
    });
    return { outcome: "off" as const, reason: "Client opted out" };
  }

  const details = extractSharedContactDetails(inboundText);
  const hasContactDetails = await saveSharedContactDetails({
    admin,
    orgId,
    leadId,
    details,
  });

  const { data: messages, error: messagesError } = await admin
    .from("messages")
    .select("direction_in_out,raw_json")
    .eq("org_id", orgId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(50);
  if (messagesError) throw messagesError;

  const automatedReplyCount = (messages || []).filter(
    (message: any) =>
      message.direction_in_out === "out" &&
      message.raw_json?.automated === true &&
      message.raw_json?.action_key === "new_enquiry_reply",
  ).length;

  // Progressive qualification is deliberately capped. A human takes over
  // after two automated messages so Clippy cannot pester or loop with a lead.
  if (automatedReplyCount >= 2) {
    return {
      outcome: "approval" as const,
      reason: "Automatic qualification limit reached",
    };
  }

  const sensitive = isSensitivePropertyMessage(inboundText);
  const confidence = sensitive ? 0.5 : 0.98;
  const decision = await evaluateAutomationAction({
    admin,
    orgId,
    actionKey: "new_enquiry_reply",
    leadId,
    confidence,
    sensitive,
  });
  if (decision.outcome === "off") return decision;

  const agentName = await resolveAgentName(admin, orgId);
  const content = buildFacebookQualificationReply({
    agentName,
    automatedReplyCount,
    hasContactDetails,
  });
  const idempotencyKey = `facebook-enquiry:${orgId}:${externalMessageId || conversationId}:${automatedReplyCount}`;

  if (decision.outcome === "approval") {
    await queueAutomationApproval({
      admin,
      orgId,
      actionKey: "new_enquiry_reply",
      channel: "facebook",
      recipient,
      content,
      leadId,
      conversationId,
      confidence,
      reason: decision.reason,
      idempotencyKey,
    });
    return decision;
  }

  const delivery = await deliverApprovedMessage({
    admin,
    orgId,
    channel: "facebook",
    recipient,
    content,
    facebookPageId: pageId,
  });
  const now = new Date().toISOString();
  const sent = await admin.from("messages").insert({
    org_id: orgId,
    conversation_id: conversationId,
    direction_in_out: "out",
    text: content,
    read_at: now,
    raw_json: {
      channel: "facebook",
      action_key: "new_enquiry_reply",
      automated: true,
      confidence,
      external_message_id: delivery.externalId,
      delivery_status: "sent",
      facebook_page_id: pageId,
    },
  });
  if (sent.error) throw sent.error;
  const updated = await admin
    .from("conversations")
    .update({ last_message_at: now, updated_at: now })
    .eq("id", conversationId)
    .eq("org_id", orgId);
  if (updated.error) throw updated.error;

  return { outcome: "automatic" as const, reason: null };
}

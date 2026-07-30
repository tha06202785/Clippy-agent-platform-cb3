export type DraftActionChannel = "email" | "sms" | "whatsapp" | "copy";

export type ProposedDraftAction = {
  id: string;
  type: "message_draft";
  channel: DraftActionChannel;
  title: string;
  subject: string | null;
  content: string;
  recipient: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  requiresApproval: true;
};

const DRAFT_INTENT =
  /\b(draft|write|compose|reply|respond|follow[\s-]?up|send)\b|\b(email|e-mail|sms|text|whatsapp)\s+(to|for|him|her|them|the client|client)\b/i;

export function shouldCreateDraftAction(message: string) {
  return DRAFT_INTENT.test(message);
}

export function resolveDraftChannel({
  message,
  conversationChannel,
  email,
  phone,
}: {
  message: string;
  conversationChannel?: string | null;
  email?: string | null;
  phone?: string | null;
}): DraftActionChannel {
  if (/\b(whatsapp)\b/i.test(message)) return phone ? "whatsapp" : "copy";
  if (/\b(sms|text message|text them|text her|text him)\b/i.test(message)) {
    return phone ? "sms" : "copy";
  }
  if (/\b(email|e-mail)\b/i.test(message)) return email ? "email" : "copy";

  const normalised = conversationChannel?.toLowerCase();
  if (normalised === "email" && email) return "email";
  if (["sms", "text"].includes(normalised || "") && phone) return "sms";
  if (normalised === "whatsapp" && phone) return "whatsapp";
  if (email) return "email";
  if (phone) return "sms";
  return "copy";
}

export function buildDraftLaunchUrl(action: ProposedDraftAction) {
  if (action.channel === "email" && action.recipient.email) {
    const params = new URLSearchParams();
    if (action.subject) params.set("subject", action.subject);
    params.set("body", action.content);
    return `mailto:${action.recipient.email}?${params.toString()}`;
  }

  if (action.channel === "sms" && action.recipient.phone) {
    return `sms:${action.recipient.phone}?body=${encodeURIComponent(
      action.content,
    )}`;
  }

  if (action.channel === "whatsapp" && action.recipient.phone) {
    const phone = action.recipient.phone.replace(/[^\d]/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(action.content)}`;
  }

  return null;
}

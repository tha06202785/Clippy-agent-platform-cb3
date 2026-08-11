type DraftContext = {
  clientName?: string | null;
  agentName?: string | null;
  latestClientMessage?: string | null;
};

const ADDRESS_PATTERN = /\b\d+[A-Za-z]?\s+[A-Za-z0-9][A-Za-z0-9 .'-]{1,60}\s(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Court|Ct|Lane|Ln|Boulevard|Blvd|Way|Parade|Pde)\b/i;
const DAY_PATTERN = /\b(?:this\s+)?(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i;

export function createSafeDraftFallback({
  clientName,
  agentName,
  latestClientMessage,
}: DraftContext): string {
  const message = latestClientMessage || "";
  const introducedName = message.match(/\b(?:I['’]?m|I am|my name is)\s+([A-Za-z][A-Za-z'-]{1,40})\b/i)?.[1];
  const greetingName = introducedName || clientName?.split(/\s+/)[0] || "there";
  const address = message.match(ADDRESS_PATTERN)?.[0];
  const day = message.match(DAY_PATTERN)?.[1];
  const asksInspection = /\binspect(?:ion)?\b|\bopen home\b|\bview(?:ing)?\b/i.test(message);

  const opening = address
    ? `Thanks for your enquiry about ${address}.`
    : "Thanks for your enquiry.";
  const nextStep = asksInspection
    ? `I’ll check the available inspection times${day ? ` for ${day}` : ""} and get back to you shortly. Is there a particular time that suits you?`
    : "I’ll review the details and get back to you shortly.";
  const signature = agentName?.trim() ? `Kind regards,\n${agentName.trim()}` : "Kind regards";

  return `Hi ${greetingName},\n\n${opening} ${nextStep}\n\n${signature}`;
}

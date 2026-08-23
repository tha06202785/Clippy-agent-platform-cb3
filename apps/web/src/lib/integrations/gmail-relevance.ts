export type GmailRelevanceItem = {
  source: "email" | "calendar";
  title: string;
  content: string;
  metadata: Record<string, unknown>;
};

const PROPERTY_CONTEXT_TERMS = [
  "property",
  "inspection",
  "inspect",
  "open home",
  "open house",
  "listing",
  "buyer",
  "vendor",
  "rental",
  "rent",
  "lease",
  "tenant",
  "apartment",
  "townhouse",
  "auction",
  "real estate",
  "enquiry",
  "inquiry",
  "domain.com.au",
  "realestate.com.au",
];

const NON_LEAD_TERMS = [
  "unsubscribe",
  "newsletter",
  "receipt",
  "invoice",
  "subscription will be cancelled",
  "subscription suspended",
  "update payment",
  "transaction was declined",
  "payment declined",
  "order history",
  "refund policy",
  "security alert",
  "password",
  "verification code",
  "one-time code",
  "order confirmation",
  "delivery update",
  "statement available",
  "marketing preferences",
  "manage preferences",
  "email preferences",
  "view in browser",
  "view this email",
  "read online",
  "weekly digest",
  "issue #",
];

const LEAD_INTENT_TERMS = [
  "i'm interested",
  "i’m interested",
  "i am interested",
  "interested in",
  "would like to inspect",
  "book an inspection",
  "arrange an inspection",
  "request an inspection",
  "inspection still available",
  "available for inspection",
  "is this available",
  "is it available",
  "still available",
  "can i inspect",
  "can we inspect",
  "can i view",
  "can we view",
  "when can i inspect",
  "when can we inspect",
  "make an offer",
  "want to buy",
  "want to rent",
  "looking to buy",
  "looking to rent",
  "enquiring about",
  "inquiring about",
  "contact me",
];

const LEAD_SUBJECT_TERMS = [
  "enquiry",
  "inquiry",
  "inspection",
  "buyer",
  "rental application",
  "property offer",
];

const LEAD_FOLLOW_UP_TERMS = [
  "confirmation",
  "confirm my",
  "didn't get",
  "didn’t get",
  "did not get",
  "haven't received",
  "haven’t received",
  "have not received",
  "not received",
  "waiting for",
  "please resend",
];

const CALENDAR_REAL_ESTATE_TERMS = [
  "property inspection",
  "inspection",
  "open home",
  "open house",
  "property viewing",
  "rental viewing",
  "property appraisal",
  "listing appraisal",
  "listing presentation",
  "vendor meeting",
  "buyer meeting",
  "tenant meeting",
  "lease signing",
  "property settlement",
  "pre-settlement",
  "auction",
];

const STREET_ADDRESS_PATTERN =
  /\b\d{1,6}\s+[A-Za-z0-9'’-]+(?:\s+[A-Za-z0-9'’-]+){0,7}\s+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Court|Ct|Crescent|Cres|Lane|Ln|Place|Pl|Parade|Pde|Boulevard|Blvd|Highway|Hwy|Way|Terrace|Tce)\b/i;

function escapedTerm(term: string): string {
  return term
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
}

function includesTerm(value: string, term: string): boolean {
  if (/[^a-z0-9\s']/i.test(term)) return value.includes(term.toLowerCase());
  return new RegExp(`\\b${escapedTerm(term)}\\b`, "i").test(value);
}

function includesAny(value: string, terms: readonly string[]): boolean {
  return terms.some((term) => includesTerm(value, term));
}

export function isLikelyRealEstateLead(item: GmailRelevanceItem): boolean {
  if (item.source !== "email") return false;

  const email = String(item.metadata.email_address || "")
    .toLowerCase()
    .trim();
  const subject = item.title.toLowerCase();
  const content = `${item.title} ${item.content}`.toLowerCase();
  if (!email) return false;

  const trustedPortal = /@(domain\.com\.au|realestate\.com\.au)$/i.test(email);
  const localPart = email.split("@", 1)[0] || "";
  const automatedSender =
    /(?:^|[._+-])(?:no-?reply|do-?not-?reply|notifications?|mailer-daemon|alerts?)(?:$|[._+-])/i.test(
      localPart,
    );
  if (automatedSender && !trustedPortal) return false;
  if (includesAny(content, NON_LEAD_TERMS)) return false;

  const hasAddress = STREET_ADDRESS_PATTERN.test(content);
  const hasPropertyContext = includesAny(content, PROPERTY_CONTEXT_TERMS);
  const hasIntent = includesAny(content, LEAD_INTENT_TERMS);
  const subjectLooksLikeLead = includesAny(subject, LEAD_SUBJECT_TERMS);
  const hasFollowUpIntent = includesAny(content, LEAD_FOLLOW_UP_TERMS);
  const linkCount = content.match(/https?:\/\//g)?.length || 0;

  if (
    linkCount >= 3 &&
    !(trustedPortal && subjectLooksLikeLead && hasAddress)
  ) {
    return false;
  }

  // A postal address in a receipt, subscription notice or company footer is
  // not a lead. Address-only messages need another real-estate or enquiry
  // signal before Clippy is allowed to create client records.
  if (
    hasAddress &&
    (hasPropertyContext ||
      hasIntent ||
      subjectLooksLikeLead ||
      hasFollowUpIntent ||
      trustedPortal)
  ) {
    return true;
  }

  // Broad phrases such as "I'm interested" and "contact me" never qualify on
  // their own. They must be anchored to an actual real-estate context.
  return (
    hasPropertyContext &&
    (hasIntent || subjectLooksLikeLead || hasFollowUpIntent || trustedPortal)
  );
}

export function isLikelyRealEstateCalendarItem(
  item: GmailRelevanceItem,
): boolean {
  if (item.source !== "calendar") return false;
  if (item.metadata.clippy_business_event === true) return true;

  const content = `${item.title} ${item.content}`.toLowerCase();
  const clientFollowUp =
    includesAny(content, ["follow up", "follow-up"]) &&
    includesAny(content, [
      "buyer",
      "vendor",
      "tenant",
      "landlord",
      "client",
      "listing",
      "property",
    ]);
  return includesAny(content, CALENDAR_REAL_ESTATE_TERMS) || clientFollowUp;
}

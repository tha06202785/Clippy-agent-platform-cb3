export type GmailRelevanceItem = {
  source: "email" | "calendar";
  title: string;
  content: string;
  metadata: Record<string, unknown>;
};

export type GmailRelevanceDecision = "relevant" | "review" | "irrelevant";

export type GmailRelevanceContext = {
  manualDecision?: "relevant" | "irrelevant" | null;
  trustedThread?: boolean;
  knownLead?: boolean;
  knownListing?: boolean;
};

export type GmailRelevanceAssessment = {
  decision: GmailRelevanceDecision;
  score: number;
  confidence: number;
  tags: string[];
  reasons: string[];
};

export const GMAIL_RELEVANCE_VERSION = 4;

const PROPERTY_CONTEXT_TERMS = [
  "property",
  "inspection",
  "inspect",
  "open home",
  "open house",
  "viewing",
  "listing",
  "buyer",
  "vendor",
  "seller",
  "rental",
  "rent",
  "lease",
  "tenant",
  "landlord",
  "apartment",
  "townhouse",
  "auction",
  "real estate",
  "enquiry",
  "inquiry",
  "domain.com.au",
  "realestate.com.au",
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
  "submit an offer",
  "want to buy",
  "want to rent",
  "looking to buy",
  "looking to rent",
  "sell my property",
  "selling my property",
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
  "market appraisal",
  "property appraisal",
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

const REAL_ESTATE_WORKFLOW_TERMS = [
  "contract of sale",
  "section 32",
  "vendor statement",
  "settlement",
  "pre-settlement",
  "conveyancer",
  "conveyancing",
  "rental application",
  "tenancy application",
  "lease agreement",
  "lease renewal",
  "condition report",
  "bond refund",
  "bond claim",
  "rental ledger",
  "rent receipt",
  "rent payment",
  "rent arrears",
  "routine inspection",
  "property management",
  "property manager",
  "owners corporation",
  "listing appraisal",
  "market appraisal",
  "property appraisal",
  "listing presentation",
  "maintenance request",
  "repair request",
];

const SECURITY_TERMS = [
  "security alert",
  "verification code",
  "one-time code",
  "one time code",
  "password reset",
  "reset your password",
  "new sign-in",
  "new sign in",
  "new device signed",
  "two-factor authentication",
  "2-step verification",
  "confirm your identity",
];

const BILLING_AND_COMMERCE_TERMS = [
  "receipt",
  "subscription",
  "subscription will be cancelled",
  "subscription suspended",
  "update payment",
  "transaction was declined",
  "payment declined",
  "payment was successful",
  "order confirmation",
  "order history",
  "delivery update",
  "refund policy",
  "balance owing",
  "total outstanding",
  "debt collection",
  "debt recovery",
  "payment plans available",
  "account has been paid",
  "how to pay",
  "statement available",
];

const BULK_MARKETING_TERMS = [
  "unsubscribe",
  "newsletter",
  "marketing preferences",
  "manage preferences",
  "email preferences",
  "view in browser",
  "view this email",
  "read online",
  "weekly digest",
  "issue #",
];

const PERSONAL_CONTEXT_TERMS = [
  "school fees",
  "school excursion",
  "cricket training",
  "medical appointment",
  "flight itinerary",
  "hotel booking",
];

const TRUSTED_PROPERTY_DOMAINS = [
  "domain.com.au",
  "realestate.com.au",
  "tenantapp.com.au",
  "inspectrealestate.com.au",
  "2apply.com.au",
  "ignite.com.au",
  "snug.com",
  "propertyme.com",
  "propertytree.com",
  "agentbox.net.au",
  "rexsoftware.com",
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

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function senderDomain(email: string): string {
  return email.split("@").at(-1)?.toLowerCase() || "";
}

function matchesDomain(domain: string, expected: string): boolean {
  return domain === expected || domain.endsWith(`.${expected}`);
}

function addTag(tags: Set<string>, condition: boolean, tag: string) {
  if (condition) tags.add(tag);
}

function assessment(
  decision: GmailRelevanceDecision,
  score: number,
  tags: Set<string>,
  reasons: string[],
  confidence?: number,
): GmailRelevanceAssessment {
  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  const calculatedConfidence =
    decision === "review"
      ? 0.5
      : Math.min(
          0.99,
          Math.max(
            0.6,
            0.6 +
              Math.abs(boundedScore - (decision === "relevant" ? 50 : 25)) /
                100,
          ),
        );
  return {
    decision,
    score: boundedScore,
    confidence: confidence ?? calculatedConfidence,
    tags: Array.from(tags),
    reasons,
  };
}

export function classifyGmailRelevance(
  item: GmailRelevanceItem,
  context: GmailRelevanceContext = {},
): GmailRelevanceAssessment {
  const tags = new Set<string>();
  const reasons: string[] = [];
  if (item.source !== "email") {
    return assessment(
      "irrelevant",
      0,
      new Set(["not-email"]),
      ["source_is_not_email"],
      0.99,
    );
  }

  const email = String(item.metadata.email_address || "")
    .toLowerCase()
    .trim();
  const subject = item.title.toLowerCase();
  const content = `${item.title} ${item.content}`.toLowerCase();
  const labels = stringArray(item.metadata.label_ids).map((label) =>
    label.toUpperCase(),
  );
  const domain = senderDomain(email);
  const trustedPortal = TRUSTED_PROPERTY_DOMAINS.some((candidate) =>
    matchesDomain(domain, candidate),
  );
  const localPart = email.split("@", 1)[0] || "";
  const automatedSender =
    /(?:^|[._+-])(?:no-?reply|do-?not-?reply|notifications?|mailer-daemon|alerts?)(?:$|[._+-])/i.test(
      localPart,
    );
  const listHeader = [
    item.metadata.list_unsubscribe,
    item.metadata.list_id,
    item.metadata.precedence,
  ]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();
  const linkCount = content.match(/https?:\/\//g)?.length || 0;
  const hasAddress = STREET_ADDRESS_PATTERN.test(content);
  const hasPropertyContext = includesAny(content, PROPERTY_CONTEXT_TERMS);
  const hasIntent = includesAny(content, LEAD_INTENT_TERMS);
  const subjectLooksLikeLead = includesAny(subject, LEAD_SUBJECT_TERMS);
  const hasFollowUpIntent = includesAny(content, LEAD_FOLLOW_UP_TERMS);
  const hasWorkflowContext = includesAny(content, REAL_ESTATE_WORKFLOW_TERMS);
  const hasSecurityContext = includesAny(content, SECURITY_TERMS);
  const hasBillingContext = includesAny(content, BILLING_AND_COMMERCE_TERMS);
  const hasMarketingContext =
    includesAny(content, BULK_MARKETING_TERMS) ||
    /\b(?:bulk|list|junk)\b/.test(listHeader) ||
    linkCount >= 3;
  const hasPersonalContext = includesAny(content, PERSONAL_CONTEXT_TERMS);

  addTag(tags, trustedPortal, "portal-lead");
  addTag(tags, context.knownLead === true, "known-client");
  addTag(tags, context.knownListing === true, "known-property");
  addTag(tags, includesAny(content, ["buyer", "buy", "purchaser"]), "buyer");
  addTag(
    tags,
    includesAny(content, [
      "rent",
      "rental",
      "lease",
      "tenant",
      "landlord",
      "bond",
    ]),
    "rental",
  );
  addTag(
    tags,
    includesAny(content, [
      "inspection",
      "inspect",
      "open home",
      "open house",
      "viewing",
    ]),
    "inspection",
  );
  addTag(tags, includesAny(content, ["offer", "negotiation"]), "offer");
  addTag(
    tags,
    includesAny(content, ["vendor", "seller", "sell my", "selling my"]),
    "vendor",
  );
  addTag(tags, includesAny(content, ["appraisal"]), "appraisal");
  addTag(
    tags,
    includesAny(content, [
      "property management",
      "property manager",
      "tenant",
      "landlord",
      "rent arrears",
      "condition report",
      "maintenance request",
      "repair request",
    ]),
    "property-management",
  );
  addTag(
    tags,
    includesAny(content, [
      "contract of sale",
      "section 32",
      "settlement",
      "conveyancer",
      "conveyancing",
    ]),
    "contract-settlement",
  );
  addTag(tags, automatedSender, "automated");
  addTag(tags, hasSecurityContext, "security");
  addTag(tags, hasBillingContext, "billing");
  addTag(tags, hasMarketingContext, "newsletter");
  addTag(tags, hasPersonalContext, "personal");

  if (context.manualDecision === "relevant") {
    tags.add("agent-confirmed");
    return assessment("relevant", 100, tags, ["agent_marked_relevant"], 0.99);
  }
  if (context.manualDecision === "irrelevant") {
    tags.add("agent-ignored");
    return assessment("irrelevant", 0, tags, ["agent_marked_irrelevant"], 0.99);
  }
  if (!email) {
    tags.add("missing-sender");
    return assessment("irrelevant", 0, tags, ["sender_address_missing"], 0.99);
  }
  if (labels.some((label) => label === "SPAM" || label === "TRASH")) {
    tags.add("gmail-junk");
    return assessment("irrelevant", 0, tags, ["gmail_spam_or_trash"], 0.99);
  }
  if (context.trustedThread) {
    tags.add("confirmed-thread");
    return assessment(
      "relevant",
      100,
      tags,
      ["previous_real_estate_message_in_thread"],
      0.99,
    );
  }
  if (hasSecurityContext) {
    return assessment(
      "irrelevant",
      0,
      tags,
      ["security_or_authentication_message"],
      0.99,
    );
  }

  const hasStrongPropertyAnchor =
    context.knownListing === true ||
    trustedPortal ||
    hasWorkflowContext ||
    (context.knownLead === true && hasPropertyContext) ||
    (hasAddress && hasPropertyContext);
  if (hasBillingContext && !hasStrongPropertyAnchor) {
    return assessment(
      "irrelevant",
      5,
      tags,
      ["billing_or_commerce_without_property_context"],
      0.97,
    );
  }
  if (hasMarketingContext && !context.knownListing) {
    return assessment(
      "irrelevant",
      5,
      tags,
      ["bulk_or_marketing_message"],
      0.97,
    );
  }
  if (
    labels.some(
      (label) => label === "CATEGORY_PROMOTIONS" || label === "CATEGORY_SOCIAL",
    ) &&
    !hasStrongPropertyAnchor
  ) {
    tags.add("gmail-non-primary");
    return assessment(
      "irrelevant",
      5,
      tags,
      ["gmail_social_or_promotions_category"],
      0.95,
    );
  }

  let score = 0;
  if (trustedPortal) {
    score += 40;
    reasons.push("trusted_property_platform");
  }
  if (context.knownListing) {
    score += 45;
    reasons.push("matches_known_property");
  }
  if (context.knownLead) {
    score += 20;
    reasons.push("matches_known_client");
  }
  if (hasAddress) {
    score += 25;
    reasons.push("street_address_detected");
  }
  if (hasPropertyContext) {
    score += 20;
    reasons.push("real_estate_language");
  }
  if (hasIntent) {
    score += 25;
    reasons.push("client_intent_detected");
  }
  if (subjectLooksLikeLead) {
    score += 20;
    reasons.push("real_estate_subject");
  }
  if (hasWorkflowContext) {
    score += 30;
    reasons.push("real_estate_workflow_detected");
  }
  if (hasFollowUpIntent && (hasPropertyContext || hasAddress)) {
    score += 10;
    reasons.push("property_follow_up_detected");
  }
  if (automatedSender && !trustedPortal) {
    score -= 15;
    reasons.push("automated_sender");
  }
  if (hasBillingContext) {
    score -= 35;
    reasons.push("billing_language_detected");
  }
  if (hasPersonalContext) {
    score -= 35;
    reasons.push("personal_context_detected");
  }

  const hasEnoughEvidence =
    (hasAddress && (hasIntent || hasPropertyContext || subjectLooksLikeLead)) ||
    (hasPropertyContext &&
      (hasIntent ||
        subjectLooksLikeLead ||
        hasFollowUpIntent ||
        hasWorkflowContext ||
        trustedPortal)) ||
    (hasWorkflowContext && (hasIntent || hasAddress || context.knownLead)) ||
    (context.knownListing === true &&
      (hasPropertyContext || hasAddress || hasWorkflowContext));

  if (score >= 50 && hasEnoughEvidence) {
    if (![...tags].some((tag) => tag !== "automated")) {
      tags.add("other-real-estate");
    }
    return assessment("relevant", score, tags, reasons);
  }
  if (score >= 25 && (hasPropertyContext || hasAddress || hasWorkflowContext)) {
    tags.add("needs-review");
    return assessment("review", score, tags, reasons);
  }

  if (!tags.size) tags.add("unrelated");
  if (!reasons.length) reasons.push("insufficient_real_estate_evidence");
  return assessment("irrelevant", score, tags, reasons);
}

export function isLikelyRealEstateLead(item: GmailRelevanceItem): boolean {
  return classifyGmailRelevance(item).decision === "relevant";
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

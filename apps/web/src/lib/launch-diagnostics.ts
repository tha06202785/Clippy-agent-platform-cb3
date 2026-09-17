import {
  normaliseImportEmail,
  normaliseImportPhone,
} from "@/lib/crm-import-deduplication";

export type DiagnosticState = "healthy" | "warning" | "error";

type PropertyEnquiryDiagnosticRecord = {
  lead_id?: string | null;
  listing_id?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
};

type AIUsageDiagnosticRecord = {
  provider?: string | null;
  status?: string | null;
  error_code?: string | null;
  latency_ms?: number | null;
  created_at?: string | null;
};

type CRMLeadDiagnosticRecord = {
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  source?: string | null;
  source_data?: Record<string, unknown> | null;
};

const INACTIVE_ENQUIRY_STATUSES = new Set([
  "archived",
  "closed",
  "dismissed",
  "spam",
]);

const INACTIVE_LEAD_STATUSES = new Set(["archived", "deleted", "merged"]);
const NON_PRODUCTION_LEAD_SOURCES = new Set([
  "comprehensive_test",
  "demo",
  "sample",
  "test",
]);
const PLACEHOLDER_PHONE_IDENTITIES = new Set([
  "15556759862",
  "61400000000",
  "61411111111",
  "61412345678",
  "61499999999",
]);

export function isActionablePropertyEnquiry(
  enquiry: PropertyEnquiryDiagnosticRecord,
) {
  const metadata = enquiry.metadata || {};
  if (metadata.test_data === true) return false;
  if (metadata.dismissed_at || metadata.dismissed_reason) return false;
  return !INACTIVE_ENQUIRY_STATUSES.has(
    String(enquiry.status || "")
      .trim()
      .toLowerCase(),
  );
}

export function summarisePropertyContextHealth(
  enquiries: PropertyEnquiryDiagnosticRecord[],
) {
  const actionable = enquiries.filter(isActionablePropertyEnquiry);
  const excluded = enquiries.length - actionable.length;
  const invalid = actionable.filter(
    (enquiry) => !enquiry.lead_id || !enquiry.listing_id,
  );
  const propertiesByLead = new Map<string, Set<string>>();

  for (const enquiry of actionable) {
    if (!enquiry.lead_id || !enquiry.listing_id) continue;
    const listings = propertiesByLead.get(enquiry.lead_id) || new Set();
    listings.add(enquiry.listing_id);
    propertiesByLead.set(enquiry.lead_id, listings);
  }

  return {
    actionable,
    excluded,
    invalid,
    multiPropertyClients: [...propertiesByLead.values()].filter(
      (listings) => listings.size > 1,
    ).length,
  };
}

export function isActionableCRMLead(lead: CRMLeadDiagnosticRecord) {
  const status = String(lead.status || "")
    .trim()
    .toLowerCase();
  const source = String(lead.source || "")
    .trim()
    .toLowerCase();
  if (INACTIVE_LEAD_STATUSES.has(status)) return false;
  if (NON_PRODUCTION_LEAD_SOURCES.has(source)) return false;
  return lead.source_data?.test_data !== true;
}

export function summariseCRMIdentityHealth(leads: CRMLeadDiagnosticRecord[]) {
  const actionable = leads.filter(isActionableCRMLead);
  const identityCounts = new Map<string, number>();
  let ignoredPlaceholderPhones = 0;

  for (const lead of actionable) {
    const email = normaliseImportEmail(lead.email);
    const phone = normaliseImportPhone(lead.phone);
    const identities = email ? [`email:${email}`] : [];
    if (phone && PLACEHOLDER_PHONE_IDENTITIES.has(phone)) {
      ignoredPlaceholderPhones += 1;
    } else if (phone) {
      identities.push(`phone:${phone}`);
    }

    for (const identity of new Set(identities)) {
      identityCounts.set(identity, (identityCounts.get(identity) || 0) + 1);
    }
  }

  return {
    actionable,
    excludedLeads: leads.length - actionable.length,
    ignoredPlaceholderPhones,
    duplicateIdentities: [...identityCounts.values()].filter(
      (count) => count > 1,
    ).length,
  };
}

export function classifyAIProviderHealth({
  configured,
  latest,
  queryError,
}: {
  configured: boolean;
  latest?: AIUsageDiagnosticRecord | null;
  queryError?: string | null;
}): { status: DiagnosticState; message: string } {
  if (!configured) {
    return {
      status: "error",
      message: "No AI provider configuration detected",
    };
  }
  if (queryError) {
    return {
      status: "warning",
      message: `AI is configured, but its latest outcome could not be verified: ${queryError}`,
    };
  }
  if (!latest) {
    return {
      status: "warning",
      message:
        "AI provider configuration detected; run one controlled Copilot test",
    };
  }
  if (latest.status === "error") {
    return {
      status: "error",
      message: `Latest AI request failed${latest.error_code ? `: ${latest.error_code}` : ""}`,
    };
  }
  if (latest.status === "success" && latest.error_code) {
    return {
      status: "warning",
      message: `Latest AI request succeeded via ${latest.provider || "fallback"}, but recorded ${latest.error_code}`,
    };
  }
  if (latest.status === "success") {
    const latency = Number(latest.latency_ms || 0);
    return {
      status: "healthy",
      message: `Latest AI request succeeded via ${latest.provider || "the configured provider"}${latency ? ` in ${latency.toLocaleString("en-AU")} ms` : ""}`,
    };
  }
  return {
    status: "warning",
    message: `Latest AI outcome is ${latest.status || "unknown"}; run one controlled Copilot test`,
  };
}

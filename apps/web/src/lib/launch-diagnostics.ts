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

const INACTIVE_ENQUIRY_STATUSES = new Set([
  "archived",
  "closed",
  "dismissed",
  "spam",
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

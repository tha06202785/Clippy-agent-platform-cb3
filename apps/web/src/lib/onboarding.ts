export type OnboardingImportResults = {
  contacts?: number;
  listings?: number;
  inspections?: number;
  calendar_events?: number;
};

export function buildPersonalWorkspaceSeed({
  userId,
  fullName,
  agencyName,
}: {
  userId: string;
  fullName?: string | null;
  agencyName: string;
}) {
  const normalisedName = fullName?.trim() || null;

  return {
    organisation: {
      id: userId,
      name: agencyName,
      market_code: "AU",
      timezone: "Australia/Melbourne",
      settings_json: {},
    },
    profile: {
      user_id: userId,
      full_name: normalisedName,
      is_onboarded: false,
    },
    membership: {
      user_id: userId,
      org_id: userId,
      role: "owner",
    },
  };
}

export function buildOnboardingSummary({
  primaryCrmName,
  importResults,
}: {
  primaryCrmName: string;
  importResults: OnboardingImportResults;
}) {
  const summary = [
    "Agency profile saved",
    `${primaryCrmName} preference saved`,
  ];

  const imported = [
    ["contacts", importResults.contacts ?? 0],
    ["listings", importResults.listings ?? 0],
    ["inspections", importResults.inspections ?? 0],
    ["calendar events", importResults.calendar_events ?? 0],
  ] as const;

  const completedImports = imported.filter(([, count]) => count > 0);
  if (completedImports.length === 0) {
    summary.push("No business data imported yet");
  } else {
    summary.push(
      ...completedImports.map(([label, count]) => `${count} ${label} imported`),
    );
  }

  summary.push(
    "Integrations remain disconnected until their OAuth connection completes",
  );

  return summary;
}

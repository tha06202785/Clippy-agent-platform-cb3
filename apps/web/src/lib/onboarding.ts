export type OnboardingImportResults = {
  contacts?: number;
  listings?: number;
  inspections?: number;
  writing_examples?: number;
  calendar_events?: number;
};

export type OnboardingImportSource = {
  label: string;
  status: "synced" | "not_connected" | "failed";
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
  importSources = [],
  importWarnings = [],
}: {
  primaryCrmName: string;
  importResults: OnboardingImportResults;
  importSources?: OnboardingImportSource[];
  importWarnings?: string[];
}) {
  const summary = [
    "Agency profile saved",
    `${primaryCrmName} preference saved`,
  ];

  const imported = [
    ["contacts", importResults.contacts ?? 0],
    ["listings", importResults.listings ?? 0],
    ["inspections", importResults.inspections ?? 0],
    ["writing examples", importResults.writing_examples ?? 0],
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

  const syncedSources = importSources
    .filter((source) => source.status === "synced")
    .map((source) => source.label);
  if (syncedSources.length > 0) {
    summary.push(`${syncedSources.join(", ")} synced`);
  } else {
    summary.push("No connected email or calendar account was synced");
  }

  if (importWarnings.length > 0) {
    summary.push(
      `${importWarnings.length} import warning${importWarnings.length === 1 ? " needs" : "s need"} attention`,
    );
  }

  return summary;
}

export type PermissionSummary = {
  granted: number;
  required: number;
  missing: string[];
};

type ConnectionTestResult = {
  success?: boolean;
  action?: string;
  status?: string;
};

const GOOGLE_REQUIRED_SCOPES: Record<string, string[]> = {
  gmail: ["https://www.googleapis.com/auth/gmail.modify"],
  "google-calendar": [
    "https://www.googleapis.com/auth/calendar.events",
  ],
};

export function getGooglePermissionSummary(
  provider: string,
  scopeValue: unknown,
): PermissionSummary | undefined {
  const requiredScopes = GOOGLE_REQUIRED_SCOPES[provider];
  if (!requiredScopes) return undefined;

  const grantedScopes =
    typeof scopeValue === "string"
      ? scopeValue.split(/\s+/).filter(Boolean)
      : [];
  const missing = requiredScopes.filter(
    (scope) => !grantedScopes.includes(scope),
  );

  return {
    granted: requiredScopes.length - missing.length,
    required: requiredScopes.length,
    missing,
  };
}

export function requiresReconnectAfterTest(
  result: ConnectionTestResult,
): boolean {
  if (result.success) return false;
  if (result.action === "refresh") return false;
  if (result.action === "reconnect") return true;

  return [
    "credential_error",
    "missing_permissions",
    "not_connected",
    "token_expired",
    "token_missing",
  ].includes(result.status || "");
}

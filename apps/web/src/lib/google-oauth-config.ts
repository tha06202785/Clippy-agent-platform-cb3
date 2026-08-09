import { getAppOrigin } from "@/lib/app-origin";

const GOOGLE_CLIENT_ID_PATTERN =
  /^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/;

type GoogleOAuthEnvironment = {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  NEXT_PUBLIC_APP_URL?: string;
};

export class GoogleOAuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleOAuthConfigurationError";
  }
}

function normaliseEnvironmentValue(value?: string): string {
  const trimmed = value?.trim() || "";
  const hasMatchingQuotes =
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")));

  return (hasMatchingQuotes ? trimmed.slice(1, -1) : trimmed).trim();
}

export function getGoogleOAuthConfig(env?: GoogleOAuthEnvironment) {
  const source = env ?? {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  };
  const clientId = normaliseEnvironmentValue(source.GOOGLE_CLIENT_ID);
  const clientSecret = normaliseEnvironmentValue(source.GOOGLE_CLIENT_SECRET);

  if (!clientId || !clientSecret) {
    throw new GoogleOAuthConfigurationError(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must both be configured",
    );
  }

  if (!GOOGLE_CLIENT_ID_PATTERN.test(clientId)) {
    throw new GoogleOAuthConfigurationError(
      "GOOGLE_CLIENT_ID must be a Google Web application client ID ending in .apps.googleusercontent.com",
    );
  }

  if (/\s/.test(clientSecret)) {
    throw new GoogleOAuthConfigurationError(
      "GOOGLE_CLIENT_SECRET must not contain whitespace",
    );
  }

  return { clientId, clientSecret };
}

export function getGoogleOAuthRedirectUri(env?: GoogleOAuthEnvironment) {
  return `${getAppOrigin(env?.NEXT_PUBLIC_APP_URL)}/api/integrations/google/callback`;
}

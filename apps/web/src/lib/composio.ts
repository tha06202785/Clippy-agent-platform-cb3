import { createHash } from "node:crypto";

const DEFAULT_COMPOSIO_API_BASE = "https://backend.composio.dev/api/v3.1";
const REQUEST_TIMEOUT_MS = 12_000;

export type ClippyComposioToolkit = "whatsapp";

type ToolkitConfiguration = {
  authConfigEnv: "COMPOSIO_WHATSAPP_AUTH_CONFIG_ID";
  provider: "whatsapp";
  slug: "WHATSAPP";
};

const TOOLKITS: Record<ClippyComposioToolkit, ToolkitConfiguration> = {
  whatsapp: {
    authConfigEnv: "COMPOSIO_WHATSAPP_AUTH_CONFIG_ID",
    provider: "whatsapp",
    slug: "WHATSAPP",
  },
};

export type ComposioConnectedAccount = {
  id: string;
  user_id: string;
  status: string;
  toolkit?: { slug?: string };
  auth_config?: {
    id?: string;
    auth_scheme?: string;
    is_composio_managed?: boolean;
  };
  created_at?: string;
  updated_at?: string;
};

export class ComposioConfigurationError extends Error {}

export class ComposioRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

function configuredApiBase() {
  const value =
    process.env.COMPOSIO_API_BASE_URL?.trim() || DEFAULT_COMPOSIO_API_BASE;
  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new ComposioConfigurationError(
      "COMPOSIO_API_BASE_URL must use HTTPS",
    );
  }
  return url.toString().replace(/\/$/, "");
}

function apiKey() {
  const value = process.env.COMPOSIO_API_KEY?.trim();
  if (!value) {
    throw new ComposioConfigurationError("COMPOSIO_API_KEY is required");
  }
  return value;
}

function toolkitConfiguration(toolkit: ClippyComposioToolkit) {
  const config = TOOLKITS[toolkit];
  const authConfigId = process.env[config.authConfigEnv]?.trim();
  if (!authConfigId) {
    throw new ComposioConfigurationError(`${config.authConfigEnv} is required`);
  }
  return { ...config, authConfigId };
}

export function isComposioToolkitConfigured(toolkit: ClippyComposioToolkit) {
  const config = TOOLKITS[toolkit];
  return Boolean(
    process.env.COMPOSIO_API_KEY?.trim() &&
    process.env[config.authConfigEnv]?.trim(),
  );
}

/** Stable pseudonymous ID: Composio never receives Clippy email addresses. */
export function getComposioUserId(orgId: string, userId: string) {
  const digest = createHash("sha256")
    .update(`clippy:composio:v1:${orgId}:${userId}`, "utf8")
    .digest("hex")
    .slice(0, 40);
  return `clippy_${digest}`;
}

async function composioFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${configuredApiBase()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey(),
      ...init?.headers,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new ComposioRequestError(
      `Composio request failed with status ${response.status}`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

export async function createComposioConnectLink({
  toolkit,
  userId,
  callbackUrl,
  alias,
}: {
  toolkit: ClippyComposioToolkit;
  userId: string;
  callbackUrl: string;
  alias: string;
}) {
  const config = toolkitConfiguration(toolkit);
  const result = await composioFetch<{
    connected_account_id?: string;
    redirect_url?: string;
    expires_at?: string;
  }>("/connected_accounts/link", {
    method: "POST",
    body: JSON.stringify({
      auth_config_id: config.authConfigId,
      user_id: userId,
      callback_url: callbackUrl,
      alias,
    }),
  });

  if (!result.redirect_url) {
    throw new ComposioRequestError(
      "Composio did not return an authentication URL",
    );
  }
  const redirectUrl = new URL(result.redirect_url);
  if (
    redirectUrl.protocol !== "https:" ||
    !(
      redirectUrl.hostname === "composio.dev" ||
      redirectUrl.hostname.endsWith(".composio.dev")
    )
  ) {
    throw new ComposioRequestError(
      "Composio returned an unexpected authentication URL",
    );
  }

  return { ...result, redirect_url: redirectUrl.toString() };
}

export async function getComposioConnectedAccount(accountId: string) {
  if (!/^ca_[A-Za-z0-9_-]+$/.test(accountId)) {
    throw new ComposioRequestError("Invalid Composio connected account ID");
  }
  return composioFetch<ComposioConnectedAccount>(
    `/connected_accounts/${encodeURIComponent(accountId)}`,
  );
}

export function verifyComposioConnectedAccount({
  account,
  toolkit,
  expectedUserId,
}: {
  account: ComposioConnectedAccount;
  toolkit: ClippyComposioToolkit;
  expectedUserId: string;
}) {
  const config = TOOLKITS[toolkit];
  return (
    account.user_id === expectedUserId &&
    account.status.toUpperCase() === "ACTIVE" &&
    account.toolkit?.slug?.toUpperCase() === config.slug
  );
}

export function getComposioToolkitProvider(toolkit: ClippyComposioToolkit) {
  return TOOLKITS[toolkit].provider;
}

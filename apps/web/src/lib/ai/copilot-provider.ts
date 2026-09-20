type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type ChatCompletion = {
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    cached_tokens?: number;
  };
  model?: string;
};

type CopilotProvider = "vercel-ai-gateway" | "openai" | "ollama";

export type ProviderAttemptErrorCode =
  | "provider_authentication_failed"
  | "provider_rate_limited"
  | "provider_timeout"
  | "provider_incomplete_response"
  | "provider_invalid_response"
  | "provider_network_error"
  | "provider_request_rejected"
  | "provider_unavailable";

export type ProviderAttemptTelemetry = {
  provider: CopilotProvider;
  attempt: number;
  status: "success" | "error";
  durationMs: number;
  httpStatus?: number;
  errorCode?: ProviderAttemptErrorCode;
};

type CopilotCompletion = {
  data: ChatCompletion;
  model: string;
  provider: CopilotProvider;
  attempts: number;
  usedRetry: boolean;
  providerAttempts: ProviderAttemptTelemetry[];
};

type CompletionOptions = {
  messages: ChatMessage[];
  userId: string;
  signal?: AbortSignal;
  attemptTimeoutMs?: number;
  providerBudgetMs?: number;
  maxAttempts?: number;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: { type: "json_object" };
  gatewayTags?: string[];
};

const DEFAULT_ATTEMPT_TIMEOUT_MS = 12_000;
const DEFAULT_PROVIDER_BUDGET_MS = 38_000;
const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_MAX_TOKENS = 1_200;
const RETRY_BASE_DELAY_MS = 250;
const MAX_RETRY_DELAY_MS = 2_000;

class ProviderHttpError extends Error {
  readonly status: number;
  readonly retryAfterMs: number | null;

  constructor(
    provider: CopilotProvider,
    status: number,
    retryAfterMs: number | null,
  ) {
    super(`${provider} returned HTTP ${status}`);
    this.name = "ProviderHttpError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

class ProviderIncompleteResponseError extends Error {
  constructor() {
    super("Provider response stopped before completion");
    this.name = "ProviderIncompleteResponseError";
  }
}

export class CopilotProviderUnavailableError extends Error {
  readonly attemptedProviders: CopilotProvider[];
  readonly providerAttempts: ProviderAttemptTelemetry[];
  readonly errorCode: ProviderAttemptErrorCode;

  constructor(
    attemptedProviders: CopilotProvider[],
    providerAttempts: ProviderAttemptTelemetry[] = [],
  ) {
    super("AI service is temporarily unavailable");
    this.name = "CopilotProviderUnavailableError";
    this.attemptedProviders = attemptedProviders;
    this.providerAttempts = providerAttempts;
    this.errorCode = primaryProviderErrorCode(providerAttempts);
  }
}

function cleanEnv(value: string | undefined, fallback = "") {
  return value?.trim() || fallback;
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1_000, MAX_RETRY_DELAY_MS);
  }
  const retryAt = Date.parse(value);
  if (!Number.isFinite(retryAt)) return null;
  return Math.min(Math.max(retryAt - Date.now(), 0), MAX_RETRY_DELAY_MS);
}

function isAbortError(error: unknown) {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function isRetryableProviderError(error: unknown) {
  if (error instanceof ProviderHttpError) {
    return error.status === 429 || error.status >= 500;
  }
  return (
    isAbortError(error) ||
    error instanceof TypeError ||
    error instanceof SyntaxError
  );
}

function safeProviderError(error: unknown) {
  if (error instanceof ProviderHttpError) return `HTTP ${error.status}`;
  if (isAbortError(error)) return "timeout";
  if (error instanceof SyntaxError) return "invalid_json";
  if (error instanceof TypeError) return "network_error";
  return "provider_error";
}

function providerAttemptErrorCode(error: unknown): ProviderAttemptErrorCode {
  if (error instanceof ProviderHttpError) {
    if (error.status === 401 || error.status === 403) {
      return "provider_authentication_failed";
    }
    if (error.status === 429) return "provider_rate_limited";
    if (error.status === 408) return "provider_timeout";
    if (error.status >= 500) return "provider_unavailable";
    return "provider_request_rejected";
  }
  if (error instanceof ProviderIncompleteResponseError) {
    return "provider_incomplete_response";
  }
  if (isAbortError(error)) return "provider_timeout";
  if (error instanceof SyntaxError) return "provider_invalid_response";
  if (error instanceof TypeError) return "provider_network_error";
  return "provider_unavailable";
}

export function primaryProviderErrorCode(
  attempts: ProviderAttemptTelemetry[],
): ProviderAttemptErrorCode {
  const codes = new Set(
    attempts
      .filter((attempt) => attempt.status === "error")
      .map((attempt) => attempt.errorCode),
  );
  const priority: ProviderAttemptErrorCode[] = [
    "provider_authentication_failed",
    "provider_rate_limited",
    "provider_timeout",
    "provider_incomplete_response",
    "provider_invalid_response",
    "provider_network_error",
    "provider_request_rejected",
    "provider_unavailable",
  ];
  return priority.find((code) => codes.has(code)) || "provider_unavailable";
}

function createDeadlineSignal(
  parent: AbortSignal | undefined,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(parent?.reason);
  if (parent?.aborted) abortFromParent();
  else parent?.addEventListener("abort", abortFromParent, { once: true });
  const timer = setTimeout(
    () =>
      controller.abort(
        new DOMException("AI provider deadline exceeded", "AbortError"),
      ),
    timeoutMs,
  );
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      parent?.removeEventListener("abort", abortFromParent);
    },
  };
}

async function waitForRetry(delayMs: number, signal: AbortSignal) {
  if (delayMs <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const finish = () => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    };
    const timer = setTimeout(finish, delayMs);
    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      reject(
        signal.reason ||
          new DOMException("AI provider deadline exceeded", "AbortError"),
      );
    };
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function postCompletion({
  url,
  token,
  body,
  provider,
  signal,
  attemptTimeoutMs,
  maxAttempts,
  attemptTelemetry,
}: {
  url: string;
  token: string;
  body: Record<string, unknown>;
  provider: CopilotProvider;
  signal: AbortSignal;
  attemptTimeoutMs: number;
  maxAttempts: number;
  attemptTelemetry: ProviderAttemptTelemetry[];
}) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (signal.aborted) throw signal.reason;
    const attemptSignal = createDeadlineSignal(signal, attemptTimeoutMs);
    const startedAt = Date.now();
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        // All three upstreams expose an OpenAI-compatible endpoint, but some
        // Ollama Cloud models may otherwise return a streaming body. This
        // route parses one complete Chat Completion document.
        body: JSON.stringify({ ...body, stream: false }),
        signal: attemptSignal.signal,
      });

      console.log(
        JSON.stringify({
          level: response.ok ? "info" : "warning",
          message: "Copilot provider attempt completed",
          provider,
          attempt,
          status: response.status,
          duration_ms: Date.now() - startedAt,
        }),
      );

      if (!response.ok) {
        throw new ProviderHttpError(
          provider,
          response.status,
          parseRetryAfter(response.headers.get("retry-after")),
        );
      }

      const data = (await response.json()) as ChatCompletion;
      if (!data.choices?.[0]?.message?.content?.trim()) {
        throw new SyntaxError("Provider returned an empty completion");
      }
      if (data.choices[0]?.finish_reason === "length") {
        throw new ProviderIncompleteResponseError();
      }
      attemptTelemetry.push({
        provider,
        attempt,
        status: "success",
        httpStatus: response.status,
        durationMs: Date.now() - startedAt,
      });
      return { data, attempts: attempt };
    } catch (error) {
      lastError = error;
      const retryable = isRetryableProviderError(error);
      attemptTelemetry.push({
        provider,
        attempt,
        status: "error",
        httpStatus:
          error instanceof ProviderHttpError ? error.status : undefined,
        errorCode: providerAttemptErrorCode(error),
        durationMs: Date.now() - startedAt,
      });
      console.warn(
        JSON.stringify({
          level: "warning",
          message: "Copilot provider attempt failed",
          provider,
          attempt,
          retryable,
          reason: safeProviderError(error),
          duration_ms: Date.now() - startedAt,
        }),
      );
      if (!retryable || attempt === maxAttempts || signal.aborted) throw error;
      const retryAfterMs =
        error instanceof ProviderHttpError ? error.retryAfterMs : null;
      const exponentialDelay = Math.min(
        RETRY_BASE_DELAY_MS * 2 ** (attempt - 1),
        MAX_RETRY_DELAY_MS,
      );
      await waitForRetry(retryAfterMs ?? exponentialDelay, signal);
    } finally {
      attemptSignal.cleanup();
    }
  }

  throw lastError;
}

export async function requestCopilotCompletion({
  messages,
  userId,
  signal,
  attemptTimeoutMs = DEFAULT_ATTEMPT_TIMEOUT_MS,
  providerBudgetMs = DEFAULT_PROVIDER_BUDGET_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  maxTokens = DEFAULT_MAX_TOKENS,
  temperature = 0.8,
  responseFormat,
  gatewayTags = ["feature:copilot", "app:clippy"],
}: CompletionOptions): Promise<CopilotCompletion> {
  const failures: string[] = [];
  const attemptedProviders: CopilotProvider[] = [];
  const providerAttempts: ProviderAttemptTelemetry[] = [];
  const deadline = createDeadlineSignal(signal, providerBudgetMs);

  try {
    const gatewayToken = cleanEnv(
      process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
    );

    if (gatewayToken && !deadline.signal.aborted) {
      attemptedProviders.push("vercel-ai-gateway");
      const model = cleanEnv(
        process.env.COPILOT_MODEL,
        "openai/gpt-5.4-mini-fast",
      );
      try {
        const result = await postCompletion({
          url: "https://ai-gateway.vercel.sh/v1/chat/completions",
          token: gatewayToken,
          provider: "vercel-ai-gateway",
          signal: deadline.signal,
          attemptTimeoutMs,
          maxAttempts,
          attemptTelemetry: providerAttempts,
          body: {
            model,
            messages,
            max_tokens: maxTokens,
            temperature,
            ...(responseFormat ? { response_format: responseFormat } : {}),
            user: userId,
            providerOptions: {
              gateway: {
                user: userId,
                models: ["openai/gpt-5.4-mini", "openai/gpt-5.4-nano"],
                tags: gatewayTags,
              },
            },
          },
        });
        return {
          data: result.data,
          model: cleanEnv(result.data.model, model),
          provider: "vercel-ai-gateway",
          attempts: result.attempts,
          usedRetry: result.attempts > 1,
          providerAttempts,
        };
      } catch (error) {
        failures.push(`vercel-ai-gateway:${safeProviderError(error)}`);
      }
    }

    const openAiToken = cleanEnv(process.env.OPENAI_API_KEY);
    if (openAiToken && !deadline.signal.aborted) {
      attemptedProviders.push("openai");
      const configuredModel = cleanEnv(
        process.env.COPILOT_OPENAI_MODEL,
        "gpt-5.4-mini",
      );
      const model = configuredModel.replace(/^openai\//, "");
      try {
        const result = await postCompletion({
          url: "https://api.openai.com/v1/chat/completions",
          token: openAiToken,
          provider: "openai",
          signal: deadline.signal,
          attemptTimeoutMs,
          maxAttempts,
          attemptTelemetry: providerAttempts,
          body: {
            model,
            messages,
            max_tokens: maxTokens,
            temperature,
            ...(responseFormat ? { response_format: responseFormat } : {}),
            user: userId,
          },
        });
        return {
          data: result.data,
          model: cleanEnv(result.data.model, model),
          provider: "openai",
          attempts: result.attempts,
          usedRetry: result.attempts > 1,
          providerAttempts,
        };
      } catch (error) {
        failures.push(`openai:${safeProviderError(error)}`);
      }
    }

    const ollamaToken = cleanEnv(process.env.OLLAMA_API_KEY);
    if (ollamaToken && !deadline.signal.aborted) {
      attemptedProviders.push("ollama");
      const model = cleanEnv(process.env.OLLAMA_MODEL, "kimi-k2.6");
      const baseUrl = cleanEnv(
        process.env.OLLAMA_BASE_URL,
        "https://ollama.com",
      );
      try {
        const result = await postCompletion({
          url: `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`,
          token: ollamaToken,
          provider: "ollama",
          signal: deadline.signal,
          attemptTimeoutMs,
          maxAttempts,
          attemptTelemetry: providerAttempts,
          body: {
            model,
            messages,
            max_tokens: maxTokens,
            temperature,
            ...(responseFormat ? { response_format: responseFormat } : {}),
          },
        });
        return {
          data: result.data,
          model: cleanEnv(result.data.model, model),
          provider: "ollama",
          attempts: result.attempts,
          usedRetry: result.attempts > 1,
          providerAttempts,
        };
      } catch (error) {
        failures.push(`ollama:${safeProviderError(error)}`);
      }
    }

    // The caller decides whether provider exhaustion is fatal. Some workflows
    // intentionally return a safe local draft, so record the provider failure
    // as a warning here and let fatal callers emit the error-level event.
    console.warn(
      JSON.stringify({
        level: "warning",
        message: "All Copilot providers failed",
        attempted_providers: attemptedProviders,
        failures,
      }),
    );
    throw new CopilotProviderUnavailableError(
      attemptedProviders,
      providerAttempts,
    );
  } finally {
    deadline.cleanup();
  }
}

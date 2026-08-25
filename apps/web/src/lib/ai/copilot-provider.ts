type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type ChatCompletion = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    cached_tokens?: number;
  };
  model?: string;
};

type CopilotProvider = "vercel-ai-gateway" | "ollama";

type CopilotCompletion = {
  data: ChatCompletion;
  model: string;
  provider: CopilotProvider;
  attempts: number;
  usedRetry: boolean;
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

export class CopilotProviderUnavailableError extends Error {
  readonly attemptedProviders: CopilotProvider[];

  constructor(attemptedProviders: CopilotProvider[]) {
    super("AI service is temporarily unavailable");
    this.name = "CopilotProviderUnavailableError";
    this.attemptedProviders = attemptedProviders;
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
}: {
  url: string;
  token: string;
  body: Record<string, unknown>;
  provider: CopilotProvider;
  signal: AbortSignal;
  attemptTimeoutMs: number;
  maxAttempts: number;
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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
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
      return { data, attempts: attempt };
    } catch (error) {
      lastError = error;
      const retryable = isRetryableProviderError(error);
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
  const deadline = createDeadlineSignal(signal, providerBudgetMs);

  try {
    const gatewayToken = cleanEnv(
      process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
    );

    if (gatewayToken && !deadline.signal.aborted) {
      attemptedProviders.push("vercel-ai-gateway");
      const model = cleanEnv(process.env.COPILOT_MODEL, "openai/gpt-5.5");
      try {
        const result = await postCompletion({
          url: "https://ai-gateway.vercel.sh/v1/chat/completions",
          token: gatewayToken,
          provider: "vercel-ai-gateway",
          signal: deadline.signal,
          attemptTimeoutMs,
          maxAttempts,
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
                models: [
                  "anthropic/claude-sonnet-4.6",
                  "google/gemini-3.1-pro-preview",
                ],
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
        };
      } catch (error) {
        failures.push(`vercel-ai-gateway:${safeProviderError(error)}`);
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
        };
      } catch (error) {
        failures.push(`ollama:${safeProviderError(error)}`);
      }
    }

    console.error(
      JSON.stringify({
        level: "error",
        message: "All Copilot providers failed",
        attempted_providers: attemptedProviders,
        failures,
      }),
    );
    throw new CopilotProviderUnavailableError(attemptedProviders);
  } finally {
    deadline.cleanup();
  }
}

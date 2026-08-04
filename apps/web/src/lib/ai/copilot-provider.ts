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

type CopilotCompletion = {
  data: ChatCompletion;
  model: string;
  provider: "vercel-ai-gateway" | "ollama";
};

const PROVIDER_TIMEOUT_MS = 30_000;

async function postCompletion({
  url,
  token,
  body,
  provider,
}: {
  url: string;
  token: string;
  body: Record<string, unknown>;
  provider: CopilotCompletion["provider"];
}) {
  const startedAt = Date.now();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });

  console.log(
    JSON.stringify({
      level: response.ok ? "info" : "warning",
      message: "Copilot provider attempt completed",
      provider,
      status: response.status,
      duration_ms: Date.now() - startedAt,
    }),
  );

  if (!response.ok) {
    throw new Error(`${provider} returned HTTP ${response.status}`);
  }

  return (await response.json()) as ChatCompletion;
}

export async function requestCopilotCompletion({
  messages,
  userId,
}: {
  messages: ChatMessage[];
  userId: string;
}): Promise<CopilotCompletion> {
  const failures: string[] = [];
  const gatewayToken =
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

  if (gatewayToken) {
    const model = process.env.COPILOT_MODEL || "openai/gpt-5.5";
    try {
      const data = await postCompletion({
        url: "https://ai-gateway.vercel.sh/v1/chat/completions",
        token: gatewayToken,
        provider: "vercel-ai-gateway",
        body: {
          model,
          messages,
          max_tokens: 4096,
          temperature: 0.8,
          user: userId,
          providerOptions: {
            gateway: {
              models: [
                "anthropic/claude-sonnet-4.6",
                "google/gemini-3.1-pro-preview",
              ],
              tags: ["feature:copilot", "app:clippy"],
            },
          },
        },
      });
      return {
        data,
        model: data.model || model,
        provider: "vercel-ai-gateway",
      };
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  const ollamaToken = process.env.OLLAMA_API_KEY;
  if (ollamaToken) {
    const model = process.env.OLLAMA_MODEL || "kimi-k2.6";
    const baseUrl = process.env.OLLAMA_BASE_URL || "https://ollama.com";
    try {
      const data = await postCompletion({
        url: `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`,
        token: ollamaToken,
        provider: "ollama",
        body: {
          model,
          messages,
          max_tokens: 4096,
          temperature: 0.8,
        },
      });
      return { data, model: data.model || model, provider: "ollama" };
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  console.error(
    JSON.stringify({
      level: "error",
      message: "All Copilot providers failed",
      failures,
    }),
  );
  throw new Error("AI service is temporarily unavailable");
}

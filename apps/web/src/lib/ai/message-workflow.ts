export type AiMessageStageName =
  "intent" | "qualification" | "stage" | "response" | "compliance";

export type AiMessageStageTelemetry = {
  stage: AiMessageStageName;
  status: "success" | "fallback";
  provider?: "vercel-ai-gateway" | "openai" | "ollama";
  model?: string;
  attempts?: number;
  usedRetry?: boolean;
  durationMs: number;
};

type StageResult<T> = {
  value: T;
  provider: "vercel-ai-gateway" | "openai" | "ollama";
  model: string;
  attempts: number;
  usedRetry: boolean;
};

export async function runAiMessageStage<T>({
  stage,
  fallback,
  execute,
  telemetry,
  onFallback,
}: {
  stage: AiMessageStageName;
  fallback: T;
  execute: () => Promise<StageResult<T>>;
  telemetry: AiMessageStageTelemetry[];
  onFallback?: (error: unknown) => void;
}): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await execute();
    telemetry.push({
      stage,
      status: "success",
      provider: result.provider,
      model: result.model,
      attempts: result.attempts,
      usedRetry: result.usedRetry,
      durationMs: Date.now() - startedAt,
    });
    return result.value;
  } catch (error) {
    telemetry.push({
      stage,
      status: "fallback",
      durationMs: Date.now() - startedAt,
    });
    onFallback?.(error);
    return fallback;
  }
}

export function shouldDeliverAutomatedAiReply(result: {
  success?: boolean;
  reply?: unknown;
  paused?: boolean;
  optedOut?: boolean;
  escalation?: boolean;
}) {
  return (
    result.success === true &&
    typeof result.reply === "string" &&
    result.reply.trim().length > 0 &&
    result.paused !== true &&
    result.optedOut !== true &&
    result.escalation !== true
  );
}

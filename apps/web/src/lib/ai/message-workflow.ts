import {
  CopilotProviderUnavailableError,
  primaryProviderErrorCode,
  type ProviderAttemptErrorCode,
  type ProviderAttemptTelemetry,
} from "./copilot-provider";

export type AiMessageStageName =
  "intent" | "qualification" | "stage" | "response" | "compliance";

export type AiMessageStageTelemetry = {
  stage: AiMessageStageName;
  status: "success" | "fallback";
  provider?: "vercel-ai-gateway" | "openai" | "ollama";
  model?: string;
  attempts?: number;
  usedRetry?: boolean;
  providerAttempts?: ProviderAttemptTelemetry[];
  errorCode?: ProviderAttemptErrorCode;
  durationMs: number;
};

type StageResult<T> = {
  value: T;
  provider: "vercel-ai-gateway" | "openai" | "ollama";
  model: string;
  attempts: number;
  usedRetry: boolean;
  providerAttempts?: ProviderAttemptTelemetry[];
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
      providerAttempts: result.providerAttempts,
      errorCode: result.providerAttempts?.some(
        (attempt) => attempt.status === "error",
      )
        ? primaryProviderErrorCode(result.providerAttempts)
        : undefined,
      durationMs: Date.now() - startedAt,
    });
    return result.value;
  } catch (error) {
    const providerError =
      error instanceof CopilotProviderUnavailableError ? error : null;
    telemetry.push({
      stage,
      status: "fallback",
      providerAttempts: providerError?.providerAttempts,
      errorCode: providerError?.errorCode,
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

import { describe, expect, it, vi } from "vitest";
import {
  runAiMessageStage,
  shouldDeliverAutomatedAiReply,
  type AiMessageStageTelemetry,
} from "../src/lib/ai/message-workflow";

describe("AI message staged degradation", () => {
  it("keeps successful sibling stages when one classifier fails", async () => {
    const telemetry: AiMessageStageTelemetry[] = [];
    const onFallback = vi.fn();

    const [intent, qualification, stage] = await Promise.all([
      runAiMessageStage({
        stage: "intent",
        fallback: { intent: "other" },
        telemetry,
        execute: async () => ({
          value: { intent: "inspection" },
          provider: "vercel-ai-gateway",
          model: "test-model",
          attempts: 1,
          usedRetry: false,
        }),
      }),
      runAiMessageStage({
        stage: "qualification",
        fallback: {},
        telemetry,
        onFallback,
        execute: async () => {
          throw new Error("provider failed");
        },
      }),
      runAiMessageStage({
        stage: "stage",
        fallback: { stage: "unknown" },
        telemetry,
        execute: async () => ({
          value: { stage: "warm" },
          provider: "ollama",
          model: "test-model",
          attempts: 2,
          usedRetry: true,
        }),
      }),
    ]);

    expect(intent).toEqual({ intent: "inspection" });
    expect(qualification).toEqual({});
    expect(stage).toEqual({ stage: "warm" });
    expect(onFallback).toHaveBeenCalledOnce();
    expect(telemetry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stage: "intent", status: "success" }),
        expect.objectContaining({
          stage: "qualification",
          status: "fallback",
        }),
        expect.objectContaining({
          stage: "stage",
          status: "success",
          attempts: 2,
          usedRetry: true,
        }),
      ]),
    );
  });
});

describe("automated AI reply delivery guard", () => {
  it("allows only successful, non-escalated replies", () => {
    expect(
      shouldDeliverAutomatedAiReply({
        success: true,
        reply: "A reviewed response",
        escalation: false,
      }),
    ).toBe(true);

    expect(
      shouldDeliverAutomatedAiReply({
        success: true,
        reply: "Safe local fallback",
        escalation: true,
      }),
    ).toBe(false);
    expect(
      shouldDeliverAutomatedAiReply({
        success: false,
        reply: "Application fallback",
      }),
    ).toBe(false);
    expect(
      shouldDeliverAutomatedAiReply({
        success: true,
        reply: "Paused reply",
        paused: true,
      }),
    ).toBe(false);
  });
});

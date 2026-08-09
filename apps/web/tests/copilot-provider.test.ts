import { afterEach, describe, expect, it, vi } from "vitest";
import { requestCopilotCompletion } from "../src/lib/ai/copilot-provider";

const originalEnv = { ...process.env };

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...originalEnv };
});

describe("Copilot provider routing", () => {
  it("uses Vercel AI Gateway when deployment OIDC is available", async () => {
    process.env.VERCEL_OIDC_TOKEN = "oidc-token";
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.OLLAMA_API_KEY;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "openai/gpt-5.5",
          choices: [{ message: { content: "Hello" } }],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestCopilotCompletion({
      messages: [{ role: "user", content: "Hello" }],
      userId: "user-1",
    });

    expect(result.provider).toBe("vercel-ai-gateway");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://ai-gateway.vercel.sh/v1/chat/completions",
    );
  });

  it("falls back to Ollama when the gateway fails", async () => {
    process.env.VERCEL_OIDC_TOKEN = "oidc-token";
    process.env.OLLAMA_API_KEY = "ollama-token";
    delete process.env.OLLAMA_BASE_URL;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("forbidden", { status: 403 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            model: "kimi-k2.6",
            choices: [{ message: { content: "Fallback response" } }],
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestCopilotCompletion({
      messages: [{ role: "user", content: "Hello" }],
      userId: "user-1",
    });

    expect(result.provider).toBe("ollama");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://ollama.com/v1/chat/completions",
    );
  });

  it("returns a safe error without exposing provider responses", async () => {
    process.env.VERCEL_OIDC_TOKEN = "oidc-token";
    process.env.OLLAMA_API_KEY = "ollama-token";
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("secret provider detail", { status: 403 }),
        ),
    );

    await expect(
      requestCopilotCompletion({
        messages: [{ role: "user", content: "Hello" }],
        userId: "user-1",
      }),
    ).rejects.toThrow("AI service is temporarily unavailable");
  });
});

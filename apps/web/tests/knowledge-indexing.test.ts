import { afterEach, describe, expect, it, vi } from "vitest";
import {
  embedKnowledge,
  KNOWLEDGE_EMBEDDING_MODEL,
} from "@/lib/knowledge-indexing";

describe("Ollama knowledge embeddings", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_API_KEY;
  });

  it("uses Ollama Cloud and returns embeddings in input order", async () => {
    process.env.OLLAMA_API_KEY = "ollama-test-key";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "embeddinggemma",
          embeddings: [
            [0.1, 0.2],
            [0.3, 0.4],
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(embedKnowledge(["first", "second"])).resolves.toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
    expect(KNOWLEDGE_EMBEDDING_MODEL).toBe("ollama:embeddinggemma");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://ollama.com/api/embed");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer ollama-test-key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init.body))).toEqual({
      model: "embeddinggemma",
      input: ["first", "second"],
      truncate: true,
    });
  });

  it("surfaces a bounded Ollama API error", async () => {
    process.env.OLLAMA_API_KEY = "ollama-test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "model is not available" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(embedKnowledge(["test"])).rejects.toThrow(
      "Ollama embedding request failed (404): model is not available",
    );
  });
});

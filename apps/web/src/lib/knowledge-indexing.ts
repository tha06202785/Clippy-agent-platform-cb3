const MODEL = process.env.OLLAMA_EMBED_MODEL?.trim() || "embeddinggemma";
const CHUNK_SIZE = 1200;
const OVERLAP = 150;

function ollamaEmbedEndpoint(): string {
  const configuredEndpoint = process.env.OLLAMA_EMBEDDING_ENDPOINT?.trim();
  if (configuredEndpoint) return configuredEndpoint;

  const baseUrl = (process.env.OLLAMA_BASE_URL || "https://ollama.com")
    .trim()
    .replace(/\/+$/, "");
  const hostUrl = baseUrl.replace(/\/(?:api|v1)$/, "");
  return `${hostUrl}/api/embed`;
}

export function chunkKnowledge(content: string): string[] {
  const clean = content.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + CHUNK_SIZE, clean.length);
    if (end < clean.length) {
      const boundary = Math.max(clean.lastIndexOf("\n", end), clean.lastIndexOf(". ", end), clean.lastIndexOf(" ", end));
      if (boundary > start + CHUNK_SIZE / 2) end = boundary + 1;
    }
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = Math.max(start + 1, end - OVERLAP);
  }
  return chunks.filter(Boolean);
}

export async function embedKnowledge(inputs: string[]): Promise<number[][]> {
  if (!inputs.length) return [];

  const endpoint = ollamaEmbedEndpoint();
  const apiKey = process.env.OLLAMA_API_KEY?.trim();
  if (endpoint.startsWith("https://ollama.com/") && !apiKey) {
    throw new Error("OLLAMA_API_KEY is required for Ollama Cloud embeddings");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: MODEL,
      input: inputs,
      truncate: true,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    let detail = responseText.slice(0, 300);
    try {
      const payload = JSON.parse(responseText) as {
        error?: string | { message?: string };
        message?: string;
      };
      detail =
        (typeof payload.error === "string"
          ? payload.error
          : payload.error?.message) ||
        payload.message ||
        detail;
    } catch {
      // Keep the bounded response text for diagnostics.
    }
    throw new Error(
      `Ollama embedding request failed (${response.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  const payload = (await response.json()) as { embeddings?: number[][] };
  const embeddings = payload.embeddings;
  if (
    !Array.isArray(embeddings) ||
    embeddings.length !== inputs.length ||
    embeddings.some(
      (embedding) => !Array.isArray(embedding) || embedding.length === 0,
    )
  ) {
    throw new Error("Ollama embedding response was incomplete");
  }
  return embeddings as number[][];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i];
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

export const KNOWLEDGE_EMBEDDING_MODEL = `ollama:${MODEL}`;

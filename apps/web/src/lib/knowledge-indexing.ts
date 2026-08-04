import OpenAI from "openai";

const MODEL = "text-embedding-3-small";
const CHUNK_SIZE = 1200;
const OVERLAP = 150;

function openai() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for knowledge indexing");
  return new OpenAI({ apiKey });
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
  const response = await openai().embeddings.create({ model: MODEL, input: inputs, encoding_format: "float" });
  return response.data.sort((a, b) => a.index - b.index).map(item => item.embedding);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i];
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

export const KNOWLEDGE_EMBEDDING_MODEL = MODEL;

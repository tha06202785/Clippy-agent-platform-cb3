const MODEL = "feature-hash-v1";
const EMBEDDING_DIMENSIONS = 768;
const CHUNK_SIZE = 1200;
const OVERLAP = 150;

function hashFeature(feature: string): number {
  let hash = 2166136261;
  for (let index = 0; index < feature.length; index += 1) {
    hash ^= feature.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function localEmbedding(input: string): number[] {
  const vector = Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  const tokens = input.toLocaleLowerCase("en-AU").match(/[\p{L}\p{N}]+/gu) || [];
  const features = [
    ...tokens.map((token) => ({ value: token, weight: 1 })),
    ...tokens.slice(1).map((token, index) => ({
      value: `${tokens[index]} ${token}`,
      weight: 0.5,
    })),
  ];

  for (const feature of features) {
    const hash = hashFeature(feature.value);
    const dimension = (hash >>> 1) % EMBEDDING_DIMENSIONS;
    vector[dimension] += (hash & 1 ? -1 : 1) * feature.weight;
  }

  const magnitude = Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0),
  );
  return magnitude ? vector.map((value) => value / magnitude) : vector;
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
  return inputs.map(localEmbedding);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i];
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

export const KNOWLEDGE_EMBEDDING_MODEL = `local:${MODEL}`;

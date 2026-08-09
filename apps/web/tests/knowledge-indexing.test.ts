import { describe, expect, it } from "vitest";
import {
  cosineSimilarity,
  embedKnowledge,
  KNOWLEDGE_EMBEDDING_MODEL,
} from "@/lib/knowledge-indexing";

describe("Local knowledge embeddings", () => {
  it("returns deterministic, normalized vectors without an API request", async () => {
    const [first, repeat] = await embedKnowledge([
      "Inspection booked for Collins Street",
      "Inspection booked for Collins Street",
    ]);

    expect(first).toEqual(repeat);
    expect(first).toHaveLength(768);
    expect(
      Math.sqrt(first.reduce((sum, value) => sum + value * value, 0)),
    ).toBeCloseTo(1);
    expect(KNOWLEDGE_EMBEDDING_MODEL).toBe("local:feature-hash-v1");
  });

  it("scores related real-estate text above unrelated text", async () => {
    const [query, related, unrelated] = await embedKnowledge([
      "Collins Street property inspection",
      "Property inspection booked on Collins Street",
      "Team lunch menu for Friday",
    ]);

    expect(cosineSimilarity(query, related)).toBeGreaterThan(
      cosineSimilarity(query, unrelated),
    );
  });

  it("handles empty batches and blank text", async () => {
    await expect(embedKnowledge([])).resolves.toEqual([]);
    const [blank] = await embedKnowledge([""]);
    expect(blank).toHaveLength(768);
    expect(blank.every((value) => value === 0)).toBe(true);
  });
});

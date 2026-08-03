import { describe, expect, it } from "vitest";
import { copilotGoldenDataset } from "../evals/copilot-golden-dataset";

describe("Copilot golden dataset", () => {
  it("has unique stable identifiers", () => {
    const ids = copilotGoldenDataset.map((testCase) => testCase.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers every launch-critical evaluation category", () => {
    const categories = new Set(copilotGoldenDataset.map((testCase) => testCase.category));
    expect(categories).toEqual(
      new Set([
        "context",
        "action-safety",
        "compliance",
        "prompt-security",
        "response-contract",
      ]),
    );
  });

  it("contains no real customer contact details", () => {
    const serialised = JSON.stringify(copilotGoldenDataset);
    expect(serialised).not.toMatch(/\b04\d{8}\b/);
    expect(serialised).not.toMatch(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  });
});


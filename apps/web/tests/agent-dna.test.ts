import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AGENT_DNA_DEFINITIONS,
  buildConfirmedAgentDnaPrompt,
  buildSuggestedAgentDnaSections,
  saveAgentDnaSectionSchema,
} from "@/lib/agent-dna";

describe("ten-section Agent DNA", () => {
  it("creates all ten guided sections without pretending recommendations are confirmed", () => {
    const sections = buildSuggestedAgentDnaSections(null);

    expect(AGENT_DNA_DEFINITIONS).toHaveLength(10);
    expect(sections).toHaveLength(10);
    expect(new Set(sections.map((section) => section.section_key)).size).toBe(
      10,
    );
    expect(sections.every((section) => section.status === "needs_input")).toBe(
      true,
    );
    expect(sections.every((section) => section.confidence === 0)).toBe(true);
  });

  it("uses sanitised voice evidence as a reviewable draft", () => {
    const sections = buildSuggestedAgentDnaSections({
      style_summary: "Warm, direct and concise.",
      style_rules: {
        sentence_style: "Use short sentences.",
        explicit: ["Finish with one clear next step."],
      },
      avoid_phrases: ["Just touching base"],
      learned_sample_count: 24,
      confidence_score: 82,
    });
    const voice = sections.find((section) => section.section_key === "voice");

    expect(voice).toMatchObject({
      source: "inferred",
      status: "draft",
      confidence: 82,
      evidence_count: 24,
    });
    expect(voice?.rules).toContain("Finish with one clear next step.");
    expect(voice?.rules).toContain("Never use: Just touching base");
  });

  it("injects confirmed sections only and preserves compliance precedence", () => {
    const prompt = buildConfirmedAgentDnaPrompt([
      {
        section_key: "identity",
        summary: "Trust matters more than speed.",
        rules: ["Be transparent."],
        goals: ["Earn referrals."],
        agent_notes: "Keep recommendations practical.",
        status: "confirmed",
      },
      {
        section_key: "growth",
        summary: "Unreviewed growth suggestion.",
        rules: ["Do not apply this."],
        goals: [],
        agent_notes: "",
        status: "draft",
      },
    ]);

    expect(prompt).toContain("Trust matters more than speed");
    expect(prompt).toContain("compliance");
    expect(prompt).not.toContain("Unreviewed growth suggestion");
  });

  it("validates agent-owned edits and rejects unsupported sections", () => {
    const valid = {
      action: "save_dna_section",
      section_key: "decisions",
      summary: "Verify facts and ask before making commitments.",
      rules: ["Escalate legal questions."],
      goals: ["Protect client trust."],
      agent_notes: "",
      status: "confirmed",
    };
    expect(saveAgentDnaSectionSchema.safeParse(valid).success).toBe(true);
    expect(
      saveAgentDnaSectionSchema.safeParse({ ...valid, section_key: "secret" })
        .success,
    ).toBe(false);
  });
});

describe("Agent DNA database isolation", () => {
  it("requires both the signed-in agent and their organisation membership", () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "../../supabase/migrations/20260827010000_agent_dna_blueprint.sql",
      ),
      "utf8",
    );

    expect(migration).toContain(
      "alter table public.agent_dna_sections enable row level security",
    );
    expect(migration).toMatch(/user_id = \(select auth\.uid\(\)\)/);
    expect(migration).toContain(
      "membership.org_id = agent_dna_sections.org_id::text",
    );
    expect(migration).toContain(
      "revoke all on public.agent_dna_sections from anon, authenticated",
    );
  });
});

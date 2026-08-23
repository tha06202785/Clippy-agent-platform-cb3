import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const source = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("controlled production-proof UI contracts", () => {
  it("lets Agency Brain trigger Google sync and reload fresh knowledge", () => {
    const knowledgePage = source("src/app/(dashboard)/knowledge/page.tsx");

    expect(knowledgePage).toContain('"/api/integrations/sync"');
    expect(knowledgePage).toContain("await load()");
    expect(knowledgePage).toContain("Sync Google");
    expect(knowledgePage).toContain('window.addEventListener("focus"');
  });

  it("uses a semantic draft form and exposes the generated preview", () => {
    const inboxPage = source("src/app/(dashboard)/inbox/page.tsx");

    expect(inboxPage).toContain('aria-label="Create Clippy draft"');
    expect(inboxPage).toContain('type="submit"');
    expect(inboxPage).toContain('aria-label="Clippy draft preview"');
    expect(inboxPage).toContain('data-testid="clippy-draft-preview"');
    expect(inboxPage).toContain("scrollIntoView");
  });

  it("records inline drafts in AI reliability telemetry", () => {
    const draftRoute = source("src/app/api/ai/draft-reply/route.ts");

    expect(draftRoute).toContain("recordAIUsage");
    expect(draftRoute).toContain('action: "conversation_draft"');
    expect(draftRoute).toContain("request_id: requestId");
  });
});

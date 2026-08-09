import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const leadPanel = readFileSync(
  resolve(process.cwd(), "src/components/lead-detail-panel.tsx"),
  "utf8",
);
const client360 = readFileSync(
  resolve(process.cwd(), "src/app/(dashboard)/clients/[id]/page.tsx"),
  "utf8",
);
const property360 = readFileSync(
  resolve(process.cwd(), "src/app/(dashboard)/property/[id]/page.tsx"),
  "utf8",
);

describe("agent action safety", () => {
  it("does not pretend a draft was delivered", () => {
    expect(leadPanel).not.toContain("Send reply");
    expect(leadPanel).not.toContain("Sending…");
    expect(leadPanel).toContain("Approve and copy");
    expect(leadPanel).toContain("confirm delivery in your email or messaging app");
  });

  it("opens Copilot with the exact conversation context", () => {
    expect(client360).toContain("conversation_id=${conversation.id}");
    expect(property360).toContain("conversation_id=${conversation.id}");
  });
});

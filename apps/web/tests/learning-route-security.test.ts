import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const learningRoute = readFileSync(
  resolve(process.cwd(), "src/app/api/learning/route.ts"),
  "utf8",
);
const getHandler = learningRoute.slice(
  learningRoute.indexOf("export async function GET"),
  learningRoute.indexOf("export async function PATCH"),
);

describe("Learning Centre integration health access", () => {
  it("keeps restricted integration diagnostics on the server client", () => {
    expect(getHandler).toContain("const admin = createAdminClient();");
    expect(getHandler).toMatch(
      /admin\s*\.from\("integrations"\)\s*\.select\("status,last_sync_at,last_error"\)/,
    );
    expect(getHandler).not.toMatch(
      /supabase\s*\.from\("integrations"\)/,
    );
  });
});

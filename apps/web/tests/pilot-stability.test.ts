import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(process.cwd(), "../..");

function source(path: string) {
  return readFileSync(resolve(repositoryRoot, path), "utf8");
}

describe("pilot message safety", () => {
  it("retires every legacy message network trigger", () => {
    const migration = source(
      "supabase/migrations/20260814091516_retire_legacy_message_network_triggers.sql",
    );

    expect(migration).toContain(
      "drop trigger if exists after_outbound_message_insert",
    );
    expect(migration).toContain(
      "drop trigger if exists trigger_outbound_message_sender",
    );
    expect(migration).toContain(
      "drop trigger if exists trigger_process_message_ai",
    );
  });

  it("keeps the retired Edge Functions non-mutating", () => {
    for (const path of [
      "supabase/functions/outbound-message-sender/index.ts",
      "supabase/functions/process-message-ai/index.ts",
    ]) {
      const functionSource = source(path);
      expect(functionSource).toContain("status: 410");
      expect(functionSource).not.toContain("createClient");
      expect(functionSource).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(functionSource).not.toContain("fetch(");
    }
  });
});

describe("pilot runtime stability", () => {
  it("uses the canonical client memory table only", () => {
    const copilotRoute = source("apps/web/src/app/api/copilot/chat/route.ts");
    const legacyAiRoute = source("apps/web/src/app/api/ai/message/route.ts");

    expect(copilotRoute).toContain('.from("client_memories")');
    expect(legacyAiRoute).toContain('.from("client_memories")');
    expect(copilotRoute).not.toContain('.from("lead_memory")');
    expect(legacyAiRoute).not.toContain('.from("lead_memory")');
  });

  it("reports intentionally disabled automation without a runtime error", () => {
    const dailyCron = source("apps/web/src/app/api/cron/daily/route.ts");

    expect(dailyCron).toContain(
      'console.warn("Daily automation disabled: secure secrets are not configured")',
    );
    expect(dailyCron).not.toContain(
      'console.error("Daily automation disabled: secure secrets are not configured")',
    );
  });
});

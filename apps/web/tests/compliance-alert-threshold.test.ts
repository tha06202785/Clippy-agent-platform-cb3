import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260803070000_add_copilot_compliance_alert_threshold.sql",
  ),
  "utf8",
);

const copilotRoute = readFileSync(
  resolve(process.cwd(), "src/app/api/copilot/chat/route.ts"),
  "utf8",
);

describe("Copilot compliance alert threshold", () => {
  it("alerts only after three interventions within sixty minutes", () => {
    expect(migration).toContain("p_threshold integer default 3");
    expect(migration).toContain("p_window_minutes integer default 60");
    expect(migration).toContain("v_recent_count < p_threshold");
  });

  it("serialises agency alerts and restricts execution to service role", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("security invoker");
  });

  it("records only issue codes and request metadata, not unsafe response text", () => {
    expect(migration).toContain("'last_checks'");
    expect(migration).toContain("'last_request_id'");
    expect(migration).not.toMatch(/raw[_ ]reply|response[_ ]text/i);
  });

  it("invokes the alert recorder only after a compliance failure", () => {
    expect(copilotRoute).toContain("if (!compliance.passed)");
    expect(copilotRoute).toContain("recordComplianceInterventionAlert({");
  });
});

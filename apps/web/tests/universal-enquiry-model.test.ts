import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260730190000_universal_enquiry_context.sql",
  ),
  "utf8",
);

describe("universal enquiry context migration", () => {
  it("links a client, property and conversation through one enquiry", () => {
    expect(migration).toContain(
      "create table if not exists public.property_enquiries",
    );
    expect(migration).toContain(
      "lead_id uuid not null references public.leads(id)",
    );
    expect(migration).toContain(
      "listing_id uuid references public.listings(id)",
    );
    expect(migration).toContain("add column if not exists enquiry_id uuid");
  });

  it("supports many property-scoped conversations without mixing them", () => {
    expect(migration).toContain(
      "drop constraint if exists conversations_org_id_lead_id_channel_key",
    );
    expect(migration).toContain("conversations_enquiry_channel_idx");
    expect(migration).toContain("where enquiry_id is not null");
  });

  it("enforces organisation-scoped RLS and API grants", () => {
    expect(migration).toContain(
      "alter table public.property_enquiries enable row level security",
    );
    expect(migration).toContain("membership.user_id = (select auth.uid())");
    expect(migration).toContain("property.org_id = property_enquiries.org_id");
    expect(migration).toContain(
      "on table public.property_enquiries to authenticated",
    );
  });
});

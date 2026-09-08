import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  admin: vi.fn(),
  persist: vi.fn(),
  lead: vi.fn(),
  receipt: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocked.admin }));
vi.mock("@/lib/conversations/persist-inbound", () => ({
  persistInboundMessage: mocked.persist,
}));
vi.mock("@/lib/leads/resolve-or-create", () => ({
  resolveOrCreateLead: mocked.lead,
}));
vi.mock("@/lib/conversations/update-delivery-status", () => ({
  updateDeliveryStatus: mocked.receipt,
}));
import { POST } from "@/app/api/webhooks/whatsapp/route";

const body = {
  entry: [
    {
      changes: [
        {
          value: {
            metadata: { phone_number_id: "12345" },
            contacts: [
              { wa_id: "61499123456", profile: { name: "Test enquirer" } },
            ],
            messages: [
              {
                id: "wamid.inbound",
                from: "61499123456",
                text: { body: "When is the inspection?" },
              },
            ],
          },
        },
      ],
    },
  ],
};

function request(payload: unknown = body, signature?: string) {
  const text = JSON.stringify(payload);
  return new NextRequest("https://useclippy.com/api/webhooks/whatsapp", {
    method: "POST",
    body: text,
    headers: {
      "x-hub-signature-256":
        signature ??
        `sha256=${createHmac("sha256", "test-meta-secret").update(text).digest("hex")}`,
    },
  });
}

function database(organisations = ["org-one"]) {
  const updates: Array<{ table: string; value: any }> = [];
  const rows = organisations.map((org_id) => ({
    org_id,
    settings_json: { whatsapp_phone_number_id: "12345" },
  }));
  const from = vi.fn((table: string) => {
    let isUpdate = false;
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      contains: vi.fn(() => query),
      insert: vi.fn(() => query),
      update: vi.fn((value: unknown) => {
        isUpdate = true;
        updates.push({ table, value });
        return query;
      }),
      single: vi.fn(async () => ({ data: { id: "event-one" }, error: null })),
      maybeSingle: vi.fn(async () => ({
        data: { id: "integration-one", ...rows[0] },
        error: null,
      })),
      then: (
        resolve: (value: unknown) => unknown,
        reject: (reason: unknown) => unknown,
      ) =>
        Promise.resolve({ data: isUpdate ? null : rows, error: null }).then(
          resolve,
          reject,
        ),
    };
    return query;
  });
  mocked.admin.mockReturnValue({ from });
  return updates;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("WHATSAPP_APP_SECRET", "test-meta-secret");
  mocked.lead.mockResolvedValue("lead-one");
  mocked.persist.mockResolvedValue({
    duplicate: false,
    conversationId: "conversation-one",
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("signed WhatsApp incoming enquiries", () => {
  it("rejects unsigned or tampered messages before database access", async () => {
    expect((await POST(request(body, "sha256=wrong"))).status).toBe(401);
    expect(mocked.admin).not.toHaveBeenCalled();
  });

  it("saves a verified enquiry in the matched agency and records receiving proof", async () => {
    const updates = database();
    expect((await POST(request())).status).toBe(200);
    expect(mocked.persist).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-one",
        externalMessageId: "wamid.inbound",
        channel: "whatsapp",
      }),
    );
    expect(updates).toContainEqual({
      table: "webhook_events",
      value: { processed: true, processing_result: "saved" },
    });
    expect(
      updates.find((item) => item.table === "integrations")?.value.settings_json
        .whatsapp_inbound_verified_at,
    ).toBeTruthy();
  });

  it("acknowledges an already-persisted message as a duplicate", async () => {
    const updates = database();
    mocked.persist.mockResolvedValue({
      duplicate: true,
      conversationId: "conversation-one",
    });
    expect((await POST(request())).status).toBe(200);
    expect(updates).toContainEqual({
      table: "webhook_events",
      value: { processed: true, processing_result: "duplicate" },
    });
  });

  it("asks Meta to retry on persistence failure instead of losing the enquiry", async () => {
    const updates = database();
    mocked.persist.mockRejectedValueOnce(new Error("database unavailable"));
    expect((await POST(request())).status).toBe(500);
    expect(updates.some((item) => item.value.processed === true)).toBe(false);
    expect(updates.some((item) => item.value.error_message)).toBe(true);
  });

  it.each([[], ["org-one", "org-two"]])(
    "never routes an unowned or ambiguous phone to the first agency",
    async (...orgs) => {
      database(orgs as string[]);
      expect((await POST(request())).status).toBe(500);
      expect(mocked.persist).not.toHaveBeenCalled();
    },
  );
});

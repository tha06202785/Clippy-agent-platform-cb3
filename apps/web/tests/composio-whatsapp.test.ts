import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getComposioUserId, unwrapComposioResult } from "@/lib/composio";
import {
  checkComposioWhatsApp,
  chooseWhatsAppPhone,
  getWhatsAppReadiness,
  parseWhatsAppPhones,
  sendComposioWhatsAppReply,
} from "@/lib/composio-whatsapp";
import { deliverApprovedMessage } from "@/lib/channels/deliver-approved-message";
import { encryptIntegrationCredentials } from "@/lib/integration-credentials";

const orgId = "org-one";
const userId = getComposioUserId(orgId, "member-one");
const phone = {
  id: "123456789",
  display_phone_number: "+61 412 345 678",
  code_verification_status: "VERIFIED",
  status: "CONNECTED",
};
const account = {
  id: "ca_demo",
  status: "ACTIVE",
  user_id: userId,
  toolkit: { slug: "whatsapp" },
};
const reply = {
  orgId,
  accountId: "ca_demo",
  phoneNumberId: phone.id,
  recipient: "+61 499 123 456",
  content: "Thanks for your inspection enquiry.",
};
const settings = {
  connection_mode: "composio",
  connected_account_id: "ca_demo",
  whatsapp_phone_number_id: phone.id,
};
let fetchMock: ReturnType<typeof vi.fn>;

function database(overrides: { members?: unknown[]; saved?: boolean } = {}) {
  const updates: unknown[] = [];
  const filters: unknown[] = [];
  const admin = {
    from: vi.fn((table: string) => {
      const result =
        table === "user_org_roles"
          ? {
              data: overrides.members ?? [{ user_id: "member-one" }],
              error: null,
            }
          : {
              data:
                overrides.saved === false
                  ? null
                  : {
                      id: "integration-one",
                      status: "connected",
                      settings_json: settings,
                      credentials_encrypted: encryptIntegrationCredentials({
                        connected_account_id: "ca_demo",
                      }),
                    },
              error: null,
            };
      const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn((...args: unknown[]) => {
          filters.push(args);
          return query;
        }),
        contains: vi.fn((...args: unknown[]) => {
          filters.push(args);
          return query;
        }),
        update: vi.fn((value: unknown) => {
          updates.push(value);
          return query;
        }),
        maybeSingle: vi.fn(async () => result),
        then: (
          resolve: (value: unknown) => unknown,
          reject: (reason: unknown) => unknown,
        ) => Promise.resolve(result).then(resolve, reject),
      };
      return query;
    }),
  };
  return { admin, updates, filters };
}

function providerResponse(
  url: string,
  sendResponse: unknown = {
    successful: true,
    data: { messages: [{ id: "wamid.confirmed" }] },
  },
) {
  return Response.json(
    url.includes("/connected_accounts/")
      ? account
      : url.endsWith("WHATSAPP_GET_PHONE_NUMBERS")
        ? {
            successful: true,
            data: { data: JSON.stringify({ data: [phone] }), successful: true },
          }
        : sendResponse,
  );
}

beforeEach(() => {
  vi.stubEnv("COMPOSIO_API_KEY", "unit-test-secret");
  vi.stubEnv("COMPOSIO_API_BASE_URL", "https://backend.composio.dev/api/v3.1");
  vi.stubEnv(
    "INTEGRATION_ENCRYPTION_KEY",
    Buffer.alloc(32, 7).toString("base64"),
  );
  fetchMock = vi.fn(async (url: string) => providerResponse(url));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Composio WhatsApp replies", () => {
  it("routes an approved reply through the agency's Composio account with no direct Meta token", async () => {
    const { admin, filters } = database();
    const result = await deliverApprovedMessage({
      admin,
      orgId,
      channel: "whatsapp",
      recipient: reply.recipient,
      content: reply.content,
    });
    expect(result.externalId).toBe("wamid.confirmed");
    const [url, options] = fetchMock.mock.calls[2] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(
      "https://backend.composio.dev/api/v3.1/tools/execute/WHATSAPP_SEND_MESSAGE",
    );
    expect(JSON.parse(options.body as string)).toEqual({
      connected_account_id: "ca_demo",
      user_id: userId,
      version: "20260815_00",
      arguments: {
        phone_number_id: phone.id,
        to_number: "61499123456",
        text: reply.content,
      },
    });
    expect(filters).toContainEqual(["org_id", orgId]);
    expect(
      fetchMock.mock.calls.every(
        ([url]) => !url.includes("graph.facebook.com"),
      ),
    ).toBe(true);
  });

  it("rejects an account owned by another agency before any tool execution", async () => {
    const { admin } = database({ members: [{ user_id: "different-member" }] });
    await expect(
      sendComposioWhatsAppReply({ ...reply, admin }),
    ).rejects.toThrow("active member");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a stale or unrelated sender before sending", async () => {
    const { admin } = database();
    await expect(
      sendComposioWhatsAppReply({ ...reply, admin, phoneNumberId: "99999" }),
    ).rejects.toThrow("no longer available");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    "not a number",
    "0499123456",
    "61499123456 ext123",
    "61499123456<script>",
  ])(
    "rejects invalid recipient %s without a provider call",
    async (recipient) => {
      await expect(
        sendComposioWhatsAppReply({
          ...reply,
          admin: database().admin,
          recipient,
        }),
      ).rejects.toThrow("country code");
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("does not report a send as successful without a provider message ID", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      providerResponse(url, { successful: true, data: {} }),
    );
    await expect(
      sendComposioWhatsAppReply({ ...reply, admin: database().admin }),
    ).rejects.toThrow("message ID");
  });

  it("does not retry a send whose acceptance is unknown", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("WHATSAPP_SEND_MESSAGE"))
        throw new Error("Request timed out");
      return providerResponse(url);
    });
    await expect(
      sendComposioWhatsAppReply({ ...reply, admin: database().admin }),
    ).rejects.toThrow("timed out");
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        url.endsWith("WHATSAPP_SEND_MESSAGE"),
      ),
    ).toHaveLength(1);
  });

  it("rejects unsuccessful provider envelopes without leaking the upstream error", () => {
    expect(() =>
      unwrapComposioResult({
        successful: true,
        data: { successful: false, error: "token=secret" },
      }),
    ).toThrow("WhatsApp rejected");
    try {
      unwrapComposioResult({ successful: false, error: "token=secret" });
    } catch (error) {
      expect(String(error)).not.toContain("secret");
    }
  });
});

describe("WhatsApp readiness and sender selection", () => {
  it("discovers and saves one verified sender, while keeping receiving unverified", async () => {
    const { admin, updates, filters } = database();
    const result = await checkComposioWhatsApp({
      admin,
      orgId,
      integration: {
        id: "integration-one",
        metadata: {
          connection_mode: "composio",
          connected_account_id: "ca_demo",
        },
      },
    });
    expect(result).toMatchObject({
      success: true,
      status: "warning",
      can_send: true,
      can_receive: false,
      selectedPhoneId: phone.id,
    });
    expect(updates[0]).toMatchObject({
      settings_json: {
        whatsapp_phone_number_id: phone.id,
        whatsapp_sender_verified: true,
        write_enabled: true,
      },
    });
    expect(filters).toContainEqual([
      "settings_json",
      { connected_account_id: "ca_demo" },
    ]);
  });

  it("does not silently select one of several numbers or replace a missing saved number", () => {
    const phones = parseWhatsAppPhones({
      data: [phone, { ...phone, id: "987654321" }],
    });
    expect(chooseWhatsAppPhone(phones)).toBeNull();
    expect(chooseWhatsAppPhone(phones, "missing")).toBeNull();
    expect(chooseWhatsAppPhone(phones, phone.id)?.id).toBe(phone.id);
    expect(
      chooseWhatsAppPhone(
        parseWhatsAppPhones({
          data: [{ ...phone, code_verification_status: "NOT_VERIFIED" }],
        }),
      ),
    ).toBeNull();
  });

  it("refuses to save results after a concurrent disconnect or reconnect", async () => {
    await expect(
      checkComposioWhatsApp({
        admin: database({ saved: false }).admin,
        orgId,
        integration: { id: "integration-one", metadata: settings },
      }),
    ).rejects.toThrow("changed during");
  });

  it("does not claim messaging readiness from authentication alone", () => {
    expect(getWhatsAppReadiness({ connection_mode: "composio" })).toMatchObject(
      { status: "warning", can_send: false, can_receive: false },
    );
    expect(
      getWhatsAppReadiness({
        ...settings,
        whatsapp_sender_verified: true,
        whatsapp_inbound_verified_at: "2026-09-08T00:00:00Z",
      }),
    ).toMatchObject({ status: "healthy", can_send: true, can_receive: true });
  });
});

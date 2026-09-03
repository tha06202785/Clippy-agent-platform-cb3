import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canManageComposioToolkit,
  ComposioRequestError,
  createComposioConnectLink,
  getComposioConnectedAccount,
  getComposioUserId,
  isComposioToolkitConfigured,
  verifyComposioConnectedAccount,
} from "@/lib/composio";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Composio integration", () => {
  it("creates stable pseudonymous user IDs scoped to an organisation", () => {
    const first = getComposioUserId("org-one", "user-one");
    expect(first).toBe(getComposioUserId("org-one", "user-one"));
    expect(first).not.toBe(getComposioUserId("org-two", "user-one"));
    expect(first).not.toContain("org-one");
    expect(first).not.toContain("user-one");
  });

  it("reports WhatsApp as configured only when both secrets exist", () => {
    vi.stubEnv("COMPOSIO_API_KEY", "test-api-key");
    expect(isComposioToolkitConfigured("whatsapp")).toBe(false);
    vi.stubEnv("COMPOSIO_WHATSAPP_AUTH_CONFIG_ID", "ac_whatsapp");
    expect(isComposioToolkitConfigured("whatsapp")).toBe(true);
  });

  it("supports a separately configured Follow Up Boss account", () => {
    vi.stubEnv("COMPOSIO_API_KEY", "test-api-key");
    expect(isComposioToolkitConfigured("follow_up_boss")).toBe(false);
    vi.stubEnv("COMPOSIO_FOLLOW_UP_BOSS_AUTH_CONFIG_ID", "ac_fub");
    expect(isComposioToolkitConfigured("follow_up_boss")).toBe(true);
  });

  it("restricts organisation-wide CRM setup to owners and admins", () => {
    expect(canManageComposioToolkit("follow_up_boss", "owner")).toBe(true);
    expect(canManageComposioToolkit("follow_up_boss", "admin")).toBe(true);
    expect(canManageComposioToolkit("follow_up_boss", "agent")).toBe(false);
    expect(canManageComposioToolkit("whatsapp", "agent")).toBe(true);
  });

  it("creates a scoped connect link without exposing the API key", async () => {
    vi.stubEnv("COMPOSIO_API_KEY", "test-api-key");
    vi.stubEnv("COMPOSIO_WHATSAPP_AUTH_CONFIG_ID", "ac_whatsapp");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          redirect_url: "https://connect.composio.dev/link/link_123",
          connected_account_id: "ca_123",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await createComposioConnectLink({
      toolkit: "whatsapp",
      userId: "clippy_user",
      callbackUrl: "https://useclippy.com/api/integrations/composio/callback",
      alias: "clippy-whatsapp-user",
    });

    expect(result.redirect_url).toBe(
      "https://connect.composio.dev/link/link_123",
    );
    const [requestUrl, request] = fetchMock.mock.calls[0];
    expect(requestUrl).toBe(
      "https://backend.composio.dev/api/v3.1/connected_accounts/link",
    );
    expect(request.headers["x-api-key"]).toBe("test-api-key");
    expect(JSON.parse(request.body)).toMatchObject({
      auth_config_id: "ac_whatsapp",
      user_id: "clippy_user",
    });
  });

  it("uses the dedicated Follow Up Boss auth configuration", async () => {
    vi.stubEnv("COMPOSIO_API_KEY", "test-api-key");
    vi.stubEnv("COMPOSIO_FOLLOW_UP_BOSS_AUTH_CONFIG_ID", "ac_fub");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          redirect_url: "https://connect.composio.dev/link/link_fub",
          connected_account_id: "ca_fub",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createComposioConnectLink({
      toolkit: "follow_up_boss",
      userId: "clippy_user",
      callbackUrl: "https://useclippy.com/api/integrations/composio/callback",
      alias: "clippy-fub-user",
    });

    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body)).toMatchObject({
      auth_config_id: "ac_fub",
      user_id: "clippy_user",
    });
  });

  it("rejects an unexpected authentication redirect host", async () => {
    vi.stubEnv("COMPOSIO_API_KEY", "test-api-key");
    vi.stubEnv("COMPOSIO_WHATSAPP_AUTH_CONFIG_ID", "ac_whatsapp");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ redirect_url: "https://attacker.example/link" }),
            { status: 201, headers: { "Content-Type": "application/json" } },
          ),
        ),
    );

    await expect(
      createComposioConnectLink({
        toolkit: "whatsapp",
        userId: "clippy_user",
        callbackUrl: "https://useclippy.com/callback",
        alias: "clippy-whatsapp-user",
      }),
    ).rejects.toBeInstanceOf(ComposioRequestError);
  });

  it("validates account ownership, toolkit and active status", () => {
    expect(
      verifyComposioConnectedAccount({
        toolkit: "whatsapp",
        expectedUserId: "clippy_user",
        account: {
          id: "ca_123",
          user_id: "clippy_user",
          status: "ACTIVE",
          toolkit: { slug: "WHATSAPP" },
        },
      }),
    ).toBe(true);
    expect(
      verifyComposioConnectedAccount({
        toolkit: "whatsapp",
        expectedUserId: "another_user",
        account: {
          id: "ca_123",
          user_id: "clippy_user",
          status: "ACTIVE",
          toolkit: { slug: "WHATSAPP" },
        },
      }),
    ).toBe(false);
  });

  it("validates Follow Up Boss without confusing it with another toolkit", () => {
    const account = {
      id: "ca_fub",
      user_id: "clippy_user",
      status: "ACTIVE",
      toolkit: { slug: "FOLLOW_UP_BOSS" },
    };
    expect(
      verifyComposioConnectedAccount({
        toolkit: "follow_up_boss",
        expectedUserId: "clippy_user",
        account,
      }),
    ).toBe(true);
    expect(
      verifyComposioConnectedAccount({
        toolkit: "whatsapp",
        expectedUserId: "clippy_user",
        account,
      }),
    ).toBe(false);
  });

  it("rejects malformed connected account IDs before calling Composio", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      getComposioConnectedAccount("../../../wrong"),
    ).rejects.toBeInstanceOf(ComposioRequestError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

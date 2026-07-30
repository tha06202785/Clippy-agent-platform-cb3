import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  decryptIntegrationCredentials,
  encryptIntegrationCredentials,
} from "@/lib/integration-credentials";

describe("integration credential encryption", () => {
  const key = randomBytes(32).toString("base64");
  const originalEncryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY;
  const originalGoogleSecret = process.env.GOOGLE_CLIENT_SECRET;

  afterEach(() => {
    if (originalEncryptionKey === undefined) {
      delete process.env.INTEGRATION_ENCRYPTION_KEY;
    } else {
      process.env.INTEGRATION_ENCRYPTION_KEY = originalEncryptionKey;
    }
    if (originalGoogleSecret === undefined) {
      delete process.env.GOOGLE_CLIENT_SECRET;
    } else {
      process.env.GOOGLE_CLIENT_SECRET = originalGoogleSecret;
    }
  });

  it("round-trips OAuth credentials without storing plaintext", () => {
    const credentials = {
      access_token: "secret-access-token",
      refresh_token: "secret-refresh-token",
      expires_in: 3600,
    };

    const encrypted = encryptIntegrationCredentials(credentials, key);

    expect(encrypted).toMatch(/^v1:/);
    expect(encrypted).not.toContain(credentials.access_token);
    expect(decryptIntegrationCredentials(encrypted, key)).toEqual(credentials);
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptIntegrationCredentials({ token: "secret" }, key);
    const tampered =
      encrypted.slice(0, -1) + (encrypted.endsWith("A") ? "B" : "A");

    expect(() => decryptIntegrationCredentials(tampered, key)).toThrow();
  });

  it("derives a stable server-only key from the Google client secret", () => {
    delete process.env.INTEGRATION_ENCRYPTION_KEY;
    process.env.GOOGLE_CLIENT_SECRET = "stable-google-client-secret";
    const encrypted = encryptIntegrationCredentials({ token: "secret" });

    expect(decryptIntegrationCredentials(encrypted)).toEqual({
      token: "secret",
    });
  });

  it("fails closed for missing or invalid keys", () => {
    expect(() => encryptIntegrationCredentials({}, "")).toThrow(
      "INTEGRATION_ENCRYPTION_KEY is required",
    );
    expect(() =>
      encryptIntegrationCredentials({}, "not-a-32-byte-key"),
    ).toThrow("base64-encoded 32-byte key");
  });
});

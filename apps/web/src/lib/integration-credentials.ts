import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const VERSION = "v1";
const IV_BYTES = 12;
const KEY_BYTES = 32;

function decodeKey(encoded?: string): Buffer {
  const configuredKey =
    encoded === undefined ? process.env.INTEGRATION_ENCRYPTION_KEY : encoded;
  if (!configuredKey) {
    if (encoded !== undefined) {
      throw new Error("INTEGRATION_ENCRYPTION_KEY is required");
    }

    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!googleClientSecret) {
      throw new Error(
        "INTEGRATION_ENCRYPTION_KEY or GOOGLE_CLIENT_SECRET is required",
      );
    }

    return createHash("sha256")
      .update("clippy:integration-credentials:v1\0", "utf8")
      .update(googleClientSecret, "utf8")
      .digest();
  }

  const key = Buffer.from(configuredKey, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY must be a base64-encoded 32-byte key",
    );
  }
  return key;
}

export function encryptIntegrationCredentials(
  credentials: unknown,
  encodedKey?: string,
): string {
  const key = decodeKey(encodedKey);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(credentials), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

export function decryptIntegrationCredentials<T = Record<string, unknown>>(
  envelope: string,
  encodedKey?: string,
): T {
  const key = decodeKey(encodedKey);
  const [version, ivValue, tagValue, ciphertextValue, ...extra] =
    envelope.split(":");

  if (
    version !== VERSION ||
    !ivValue ||
    !tagValue ||
    !ciphertextValue ||
    extra.length > 0
  ) {
    throw new Error("Invalid integration credential envelope");
  }

  const iv = Buffer.from(ivValue, "base64url");
  const tag = Buffer.from(tagValue, "base64url");
  const ciphertext = Buffer.from(ciphertextValue, "base64url");
  if (iv.length !== IV_BYTES || tag.length !== 16 || ciphertext.length === 0) {
    throw new Error("Invalid integration credential envelope");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return JSON.parse(plaintext.toString("utf8")) as T;
}

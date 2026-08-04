import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const VERSION = "v1";
const IV_BYTES = 12;
const KEY_BYTES = 32;

function decodeKey(encoded = process.env.INTEGRATION_ENCRYPTION_KEY): Buffer {
  if (!encoded) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY is required");
  }

  const key = Buffer.from(encoded, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
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

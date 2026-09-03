import { timingSafeEqual } from "node:crypto";

export const FACEBOOK_OAUTH_STATE_COOKIE = "clippy_facebook_oauth_state";
export const GOOGLE_OAUTH_STATE_COOKIE = "clippy_google_oauth_state";
export const MICROSOFT_OAUTH_STATE_COOKIE = "clippy_microsoft_oauth_state";
export const WHATSAPP_OAUTH_STATE_COOKIE = "clippy_whatsapp_oauth_state";
export const COMPOSIO_OAUTH_STATE_COOKIE = "clippy_composio_oauth_state";

export function matchesOAuthState(
  expected?: string,
  returned?: string | null,
): boolean {
  if (!expected || !returned) return false;

  const expectedBuffer = Buffer.from(expected);
  const returnedBuffer = Buffer.from(returned);
  return (
    expectedBuffer.length === returnedBuffer.length &&
    timingSafeEqual(expectedBuffer, returnedBuffer)
  );
}

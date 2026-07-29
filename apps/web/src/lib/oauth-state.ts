import { timingSafeEqual } from "node:crypto";

export const FACEBOOK_OAUTH_STATE_COOKIE = "clippy_facebook_oauth_state";

export function matchesOAuthState(expected?: string, returned?: string | null): boolean {
  if (!expected || !returned) return false;

  const expectedBuffer = Buffer.from(expected);
  const returnedBuffer = Buffer.from(returned);
  return (
    expectedBuffer.length === returnedBuffer.length &&
    timingSafeEqual(expectedBuffer, returnedBuffer)
  );
}

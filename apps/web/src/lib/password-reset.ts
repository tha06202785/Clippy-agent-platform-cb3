import { getAppOrigin } from "@/lib/app-origin";

export const PASSWORD_RESET_PATH = "/reset-password";

export function getPasswordResetRedirectUrl(appUrl?: string): string {
  const callback = new URL("/api/auth/callback", getAppOrigin(appUrl));
  callback.searchParams.set("next", PASSWORD_RESET_PATH);
  return callback.toString();
}

export function validateNewPassword(
  password: string,
  confirmation: string,
): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password !== confirmation) return "Passwords do not match.";
  return null;
}

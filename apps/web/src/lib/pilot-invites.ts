import { z } from "zod";

export const PILOT_MAX_ACTIVE = 5;
export const PILOT_TRIAL_DAYS = 14;
export const PILOT_INVITE_VALIDITY_HOURS = 72;

export const createPilotInviteSchema = z.object({
  email: z.string().trim().email().max(320),
});

export const pilotInviteActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("revoke") }),
  z.object({ action: z.literal("resend") }),
  z.object({
    action: z.literal("extend"),
    days: z.number().int().min(1).max(30).default(PILOT_TRIAL_DAYS),
  }),
]);

export type PilotInviteStatus = "pending" | "accepted" | "revoked" | "expired";

export type PilotInviteRecord = {
  id: string;
  email: string;
  auth_user_id: string | null;
  org_id: string | null;
  status: PilotInviteStatus;
  expires_at: string;
  accepted_at: string | null;
  trial_ends_at: string | null;
  revoked_at: string | null;
  last_sent_at: string;
  send_count: number;
  created_at: string;
};

export function normalizePilotEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function addHours(from: Date, hours: number): Date {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isPilotInviteActive(
  invite: Pick<PilotInviteRecord, "status" | "expires_at" | "trial_ends_at">,
  now = new Date(),
): boolean {
  if (invite.status === "pending") {
    return new Date(invite.expires_at).getTime() > now.getTime();
  }
  if (invite.status === "accepted" && invite.trial_ends_at) {
    return new Date(invite.trial_ends_at).getTime() > now.getTime();
  }
  return false;
}

export function canResendPilotInvite(
  invite: Pick<PilotInviteRecord, "status" | "expires_at">,
  now = new Date(),
): boolean {
  return (
    invite.status === "pending" &&
    new Date(invite.expires_at).getTime() <= now.getTime()
  );
}

type PilotInviteEmailError = {
  code?: string;
  message?: string;
  status?: number;
};

export function getPilotInviteEmailFailure(
  error: PilotInviteEmailError | null | undefined,
  fallback: string,
): { message: string; status: number } {
  const detail = error?.message?.toLowerCase() || "";
  if (
    error?.status === 429 ||
    detail.includes("rate limit") ||
    detail.includes("too many requests")
  ) {
    return {
      message:
        "The invitation email limit was reached. Please wait before trying again.",
      status: 429,
    };
  }
  if (detail.includes("already")) {
    return {
      message: "This email already has a Clippy account",
      status: 409,
    };
  }
  return { message: fallback, status: error?.status || 502 };
}

export function getPilotInviteDisplayStatus(
  invite: Pick<PilotInviteRecord, "status" | "expires_at" | "trial_ends_at">,
  now = new Date(),
): PilotInviteStatus {
  if (invite.status === "pending" && !isPilotInviteActive(invite, now)) {
    return "expired";
  }
  if (invite.status === "accepted" && !isPilotInviteActive(invite, now)) {
    return "expired";
  }
  return invite.status;
}

export function getPilotRedirectUrl(origin: string): string {
  const callback = new URL("/api/auth/callback", origin);
  callback.searchParams.set("next", "/pilot/accept");
  return callback.toString();
}

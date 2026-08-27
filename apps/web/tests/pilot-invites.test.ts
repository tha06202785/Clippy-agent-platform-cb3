import { describe, expect, it } from "vitest";
import {
  addDays,
  addHours,
  createPilotInviteSchema,
  getPilotInviteDisplayStatus,
  getPilotRedirectUrl,
  isPilotInviteActive,
  normalizePilotEmail,
  pilotInviteActionSchema,
  type PilotInviteRecord,
} from "@/lib/pilot-invites";

const now = new Date("2026-08-27T00:00:00.000Z");

function invite(
  values: Partial<
    Pick<PilotInviteRecord, "status" | "expires_at" | "trial_ends_at">
  >,
) {
  return {
    status: "pending" as const,
    expires_at: addHours(now, 72).toISOString(),
    trial_ends_at: null,
    ...values,
  };
}

describe("private pilot invitations", () => {
  it("normalizes and validates agent email addresses", () => {
    expect(normalizePilotEmail("  Agent@Agency.COM.AU ")).toBe(
      "agent@agency.com.au",
    );
    expect(
      createPilotInviteSchema.safeParse({ email: "agent@example.com" }).success,
    ).toBe(true);
    expect(
      createPilotInviteSchema.safeParse({ email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("treats pending links as active only before their expiry", () => {
    expect(isPilotInviteActive(invite({}), now)).toBe(true);
    const expired = invite({ expires_at: addHours(now, -1).toISOString() });
    expect(isPilotInviteActive(expired, now)).toBe(false);
    expect(getPilotInviteDisplayStatus(expired, now)).toBe("expired");
  });

  it("treats accepted pilots as active only during their trial", () => {
    const active = invite({
      status: "accepted",
      trial_ends_at: addDays(now, 14).toISOString(),
    });
    const expired = invite({
      status: "accepted",
      trial_ends_at: addDays(now, -1).toISOString(),
    });
    expect(isPilotInviteActive(active, now)).toBe(true);
    expect(getPilotInviteDisplayStatus(expired, now)).toBe("expired");
  });

  it("uses the allowlisted callback and private acceptance path", () => {
    expect(getPilotRedirectUrl("https://useclippy.com")).toBe(
      "https://useclippy.com/api/auth/callback?next=%2Fpilot%2Faccept",
    );
  });

  it("restricts admin actions and extension length", () => {
    expect(
      pilotInviteActionSchema.safeParse({ action: "revoke" }).success,
    ).toBe(true);
    expect(
      pilotInviteActionSchema.safeParse({ action: "extend", days: 14 }).success,
    ).toBe(true);
    expect(
      pilotInviteActionSchema.safeParse({ action: "extend", days: 31 }).success,
    ).toBe(false);
    expect(pilotInviteActionSchema.safeParse({ action: "share" }).success).toBe(
      false,
    );
  });
});

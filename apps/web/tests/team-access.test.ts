import { describe, expect, it } from "vitest";
import { canManageTeam, canViewTeamActivity } from "@/lib/team-access";

describe("team access", () => {
  it.each(["owner", "admin"])("allows %s to manage the team", (role) => {
    expect(canManageTeam(role)).toBe(true);
  });

  it.each(["owner", "admin", "manager"])(
    "allows %s to view team activity",
    (role) => {
      expect(canViewTeamActivity(role)).toBe(true);
    },
  );

  it.each(["agent", "", null, undefined])(
    "does not grant elevated access to %s",
    (role) => {
      expect(canManageTeam(role)).toBe(false);
      expect(canViewTeamActivity(role)).toBe(false);
    },
  );
});

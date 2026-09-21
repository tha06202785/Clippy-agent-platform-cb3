export const TEAM_MANAGEMENT_ROLES = ["owner", "admin"] as const;
export const TEAM_ACTIVITY_ROLES = ["owner", "admin", "manager"] as const;

export function canManageTeam(role: string | null | undefined): boolean {
  return Boolean(
    role &&
    TEAM_MANAGEMENT_ROLES.includes(
      role as (typeof TEAM_MANAGEMENT_ROLES)[number],
    ),
  );
}

export function canViewTeamActivity(role: string | null | undefined): boolean {
  return Boolean(
    role &&
    TEAM_ACTIVITY_ROLES.includes(role as (typeof TEAM_ACTIVITY_ROLES)[number]),
  );
}

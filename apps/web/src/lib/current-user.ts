export const CURRENT_USER_PROFILE_FIELDS = "full_name, role, avatar_url";

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function resolveCurrentUserName({
  agent,
  profile,
  userMetadata,
  email,
}: {
  agent: Record<string, unknown> | null;
  profile: Record<string, unknown> | null;
  userMetadata: Record<string, unknown> | null | undefined;
  email: string | null | undefined;
}): string {
  return (
    text(agent?.display_name) ??
    text(agent?.full_name) ??
    text(agent?.name) ??
    text(profile?.full_name) ??
    text(userMetadata?.full_name) ??
    text(userMetadata?.name) ??
    email?.split("@")[0] ??
    "Agent"
  );
}

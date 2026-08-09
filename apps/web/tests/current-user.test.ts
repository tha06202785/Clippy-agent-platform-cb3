import { describe, expect, it } from "vitest";
import {
  CURRENT_USER_PROFILE_FIELDS,
  resolveCurrentUserName,
} from "@/lib/current-user";

describe("current user profile", () => {
  it("queries fields that exist in the production profiles schema", () => {
    expect(CURRENT_USER_PROFILE_FIELDS).toBe("full_name, role, avatar_url");
    expect(CURRENT_USER_PROFILE_FIELDS).not.toContain("display_name");
  });

  it("uses the profile full name when no agent profile name exists", () => {
    expect(
      resolveCurrentUserName({
        agent: null,
        profile: { full_name: "Teddy Thamel" },
        userMetadata: null,
        email: "fallback@example.com",
      }),
    ).toBe("Teddy Thamel");
  });

  it("keeps the established name fallback order", () => {
    expect(
      resolveCurrentUserName({
        agent: { display_name: "Teddy the Agent" },
        profile: { full_name: "Teddy Thamel" },
        userMetadata: { full_name: "Metadata Name" },
        email: "fallback@example.com",
      }),
    ).toBe("Teddy the Agent");

    expect(
      resolveCurrentUserName({
        agent: null,
        profile: null,
        userMetadata: null,
        email: "fallback@example.com",
      }),
    ).toBe("fallback");
  });
});

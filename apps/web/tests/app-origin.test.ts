import { describe, expect, it } from "vitest";
import { getAppOrigin } from "@/lib/app-origin";

describe("getAppOrigin", () => {
  it("removes accidental leading and trailing whitespace", () => {
    expect(getAppOrigin("  https://useclippy.com\n")).toBe("https://useclippy.com");
  });

  it("normalises a trailing slash", () => {
    expect(getAppOrigin("https://useclippy.com/")).toBe("https://useclippy.com");
  });

  it("rejects whitespace embedded in an origin", () => {
    expect(() => getAppOrigin("https://useclippy.com\n.example.com")).toThrow(
      "must not contain whitespace",
    );
  });

  it("falls back to the production origin", () => {
    expect(getAppOrigin("")).toBe("https://useclippy.com");
  });
});

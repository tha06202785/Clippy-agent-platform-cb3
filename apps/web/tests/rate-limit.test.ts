import { describe, it, expect } from "vitest";
import { checkRateLimit, getClientIp } from "../src/lib/rate-limit";

describe("Rate Limiter", () => {
  it("should allow first request", () => {
    const result = checkRateLimit("127.0.0.1", "test");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it("should block after exceeding limit", () => {
    const ip = "192.168.1.1";
    const path = "rate-test";
    // Exhaust the limit
    for (let i = 0; i < 30; i++) {
      checkRateLimit(ip, path);
    }
    const result = checkRateLimit(ip, path);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

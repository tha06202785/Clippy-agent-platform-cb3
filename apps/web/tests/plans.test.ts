import { describe, it, expect } from "vitest";

const BASE_URL = "http://localhost:3000";

describe("Subscription Plans API", () => {
  it("should return list of plans", async () => {
    const response = await fetch(BASE_URL + "/api/subscription/plans");
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("id");
    expect(data[0]).toHaveProperty("name");
    expect(data[0]).toHaveProperty("price");
  });

  it("should include free plan", async () => {
    const response = await fetch(BASE_URL + "/api/subscription/plans");
    const data = await response.json();
    const free = data.find((p: any) => p.id === "free");
    expect(free).toBeDefined();
    expect(free.price).toBe(0);
  });
});

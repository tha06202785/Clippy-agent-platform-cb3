import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = "http://localhost:3000";

describe("Leads API", () => {
  it("should return 401 without auth", async () => {
    const response = await fetch(BASE_URL + "/api/leads");
    expect(response.status).toBe(401);
  });

  it("should return 401 for POST without auth", async () => {
    const response = await fetch(BASE_URL + "/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: "Test Lead" }),
    });
    expect(response.status).toBe(401);
  });
});

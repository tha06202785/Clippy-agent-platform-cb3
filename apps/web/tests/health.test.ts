import { describe, it, expect } from "vitest";

describe("Health API", () => {
  it("should return ok status", async () => {
    const response = await fetch("http://localhost:3000/api/health");
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.version).toBeDefined();
  });
});

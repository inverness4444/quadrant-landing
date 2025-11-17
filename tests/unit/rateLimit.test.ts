import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/services/rateLimit";

describe("rateLimit service", () => {
  it("allows requests within limit", () => {
    const result = checkRateLimit({ key: "test:within", limit: 2, windowMs: 1000 });
    expect(result.allowed).toBe(true);
    const second = checkRateLimit({ key: "test:within", limit: 2, windowMs: 1000 });
    expect(second.allowed).toBe(true);
  });

  it("blocks when limit exceeded", () => {
    const key = `test:blocked:${Date.now()}`;
    checkRateLimit({ key, limit: 1, windowMs: 1000 });
    const blocked = checkRateLimit({ key, limit: 1, windowMs: 1000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });
});

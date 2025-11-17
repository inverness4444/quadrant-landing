import { describe, expect, it } from "vitest";
import {
  createApiError,
  planLimitError,
  validationError,
  rateLimitedError,
} from "@/services/apiError";

describe("apiError helpers", () => {
  it("creates generic api error", () => {
    const error = createApiError(400, "VALIDATION_ERROR", "Invalid");
    expect(error.status).toBe(400);
    expect(error.body.code).toBe("VALIDATION_ERROR");
    expect(error.body.message).toBe("Invalid");
  });

  it("builds plan limit error with message", () => {
    const error = planLimitError("Лимит достигнут");
    expect(error.body.code).toBe("PLAN_LIMIT_REACHED");
    expect(error.body.message).toContain("Лимит");
  });

  it("includes details for validation error", () => {
    const error = validationError({ name: ["Required"] });
    expect(error.body.code).toBe("VALIDATION_ERROR");
    expect(error.body.details).toHaveProperty("name");
  });

  it("returns retry info for rate limiting", () => {
    const error = rateLimitedError(30);
    expect(error.body.code).toBe("RATE_LIMITED");
    expect(error.body.details).toHaveProperty("retryAfter", 30);
  });
});

import { describe, expect, it } from "vitest";
import { contactSchema } from "@/lib/contactValidation";

describe("contactSchema", () => {
  it("validates correct payload", () => {
    const parsed = contactSchema.safeParse({
      name: "Test",
      email: "test@example.com",
      company: "Quadrant",
      headcount: "100-500",
      message: "Hi",
    });
    expect(parsed.success).toBe(true);
  });

  it("fails for invalid email", () => {
    const parsed = contactSchema.safeParse({
      name: "Test",
      email: "bad",
      company: "Quadrant",
      headcount: "100-500",
      message: "Hi",
    });
    expect(parsed.success).toBe(false);
  });
});

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

const ORIGINAL_ENV = process.env;

describe("env config", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("throws in production when DATABASE_URL is missing", async () => {
    process.env = { NODE_ENV: "production" } as NodeJS.ProcessEnv;
    await expect(import("@/config/env")).rejects.toThrow();
  });

  it("provides defaults in development", async () => {
    process.env = { NODE_ENV: "development" } as NodeJS.ProcessEnv;
    const envModule = await import("@/config/env");
    expect(envModule.env.databaseUrl).toContain("file:");
    expect(envModule.env.baseUrl).toContain("http://");
  });
});

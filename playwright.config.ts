import { defineConfig } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  use: {
    baseURL,
    headless: true,
  },
  webServer: {
    command: "npm run dev:test",
    port: 3000,
    timeout: 120_000,
    reuseExistingServer: false,
  },
});

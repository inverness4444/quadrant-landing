import { spawn } from "child_process";

const env = { ...process.env };
if (!env.DATABASE_URL) {
  env.DATABASE_URL = "file:./data/test.db";
}
if (!env.BASE_URL) {
  env.BASE_URL = "http://localhost:3000";
}
env.DEMO_ENABLED = env.DEMO_ENABLED ?? "true";

console.log(`[dev:test] Starting Next with DATABASE_URL=${env.DATABASE_URL}`);

const child = spawn("next", ["dev"], {
  stdio: "inherit",
  env,
});

child.on("close", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error("Failed to start dev server", error);
  process.exit(1);
});

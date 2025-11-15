import type { Config } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL ?? "file:./data/quadrant.db";

export default {
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: dbUrl,
  },
} satisfies Config;

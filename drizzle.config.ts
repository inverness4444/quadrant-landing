import type { Config } from "drizzle-kit";
import { env } from "./config/env";

export default {
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: env.databaseUrl,
  },
} satisfies Config;

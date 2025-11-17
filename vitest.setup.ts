import "@testing-library/jest-dom";
import { afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import path from "path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "@/lib/db";

afterEach(() => {
  cleanup();
});

let migrated = false;

beforeAll(async () => {
  if (migrated) return;
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle/migrations") });
  migrated = true;
});

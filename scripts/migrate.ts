import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import { db } from "../lib/db";

async function runMigrations() {
  const migrationsFolder = path.resolve(process.cwd(), "drizzle/migrations");
  await migrate(db, { migrationsFolder });
  // better-sqlite3 keeps the process alive, so exit manually
  process.exit(0);
}

runMigrations().catch((error) => {
  console.error("Failed to run migrations", error);
  process.exit(1);
});

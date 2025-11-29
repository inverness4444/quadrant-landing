import { createHash } from "crypto";
import fs from "fs";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import { db } from "../lib/db";

function getSqliteClient() {
  return (db as any).$client as { exec: (sql: string) => void; prepare: (sql: string) => { run: (...args: unknown[]) => void; all: () => { hash: string }[] } };
}

function applyRawMigrations(migrationsFolder: string) {
  const sqlite = getSqliteClient();
  const applied = new Set<string>();
  try {
    const rows = sqlite.prepare(`select hash from "__drizzle_migrations"`).all();
    rows.forEach((row) => {
      if (row?.hash) applied.add(row.hash);
    });
  } catch {
    sqlite.exec(
      `CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at numeric
      );`,
    );
  }

  const files = fs
    .readdirSync(migrationsFolder)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const fullPath = path.join(migrationsFolder, file);
    const sqlContent = fs.readFileSync(fullPath, "utf8");
    const hash = createHash("sha256").update(sqlContent).digest("hex");
    if (applied.has(hash)) continue;
    const normalizedSql = sqlContent.replace(/ADD COLUMN IF NOT EXISTS/gi, "ADD COLUMN");
    console.log(`[migrate] applying ${file}`);
    try {
      sqlite.exec(normalizedSql);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/already exists/i.test(message) || /duplicate column name/i.test(message)) {
        console.warn(`[migrate] skipping duplicates in ${file}: ${message}`);
      } else {
        throw error;
      }
    }
    sqlite.prepare(`insert into "__drizzle_migrations" (hash, created_at) values (?, strftime('%s','now')*1000)`).run(hash);
    applied.add(hash);
  }
}

async function runMigrations() {
  const migrationsFolder = path.resolve(process.cwd(), "drizzle/migrations");
  await migrate(db, { migrationsFolder });
  applyRawMigrations(migrationsFolder);
  // better-sqlite3 keeps the process alive, so exit manually
  process.exit(0);
}

runMigrations().catch((error) => {
  console.error("Failed to run migrations", error);
  process.exit(1);
});

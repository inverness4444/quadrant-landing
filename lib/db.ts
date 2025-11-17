import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import fs from "fs";
import * as schema from "@/drizzle/schema";
import { env } from "@/config/env";

function resolveDatabasePath() {
  const url = env.databaseUrl;
  if (!url.startsWith("file:")) {
    throw new Error("Only SQLite file URLs are supported in this environment");
  }
  const relativePath = url.replace(/^file:/, "");
  return path.resolve(process.cwd(), relativePath);
}

const databasePath = resolveDatabasePath();
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath);

export const db = drizzle(sqlite, { schema });

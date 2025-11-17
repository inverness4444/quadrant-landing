import fs from "fs";
import path from "path";

function resolveTestDbPath() {
  const dbUrl = process.env.DATABASE_URL || "file:./data/test.db";
  if (!dbUrl.startsWith("file:")) {
    throw new Error("DATABASE_URL for tests must point to a sqlite file");
  }
  const relative = dbUrl.replace(/^file:/, "");
  return path.resolve(process.cwd(), relative);
}

function resetTestDb() {
  const dbPath = resolveTestDbPath();
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath);
  }
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });
  console.log(`Reset test database at ${dbPath}`);
}

resetTestDb();

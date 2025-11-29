import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { config } from "@/services/config";

export async function GET() {
  let dbStatus: "ok" | "down" = "ok";
  let migrations: "ok" | "pending" = "ok";
  try {
    await db.run(sql`select 1`);
    // простая проверка наличия таблицы migrations/любого ядра
    await db.run(sql`select 1 from sqlite_master where type='table' and name='members'`);
  } catch (error) {
    console.error("readyz db error", error);
    dbStatus = "down";
  }
  if (dbStatus === "ok") {
    try {
      await db.run(sql`select 1 from sqlite_master where type='table' and name='__drizzle_migrations__'`);
    } catch {
      migrations = "pending";
    }
  } else {
    migrations = "pending";
  }
  return NextResponse.json({ status: dbStatus === "ok" && migrations === "ok" ? "ready" : "not_ready", env: config.environment, db: dbStatus, migrations });
}

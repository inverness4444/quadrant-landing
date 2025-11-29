import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { config } from "@/services/config";

export async function GET() {
  let dbStatus: "ok" | "down" = "ok";
  try {
    await db.run(sql`select 1`);
  } catch (error) {
    console.error("healthz db error", error);
    dbStatus = "down";
  }
  return NextResponse.json({ status: "ok", env: config.environment, db: dbStatus });
}

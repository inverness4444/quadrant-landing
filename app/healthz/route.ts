import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workspaces } from "@/drizzle/schema";

export async function GET() {
  let databaseStatus: "ok" | "error" = "ok";
  let errorMessage: string | null = null;

  try {
    await db.select({ id: workspaces.id }).from(workspaces).limit(1);
  } catch (error) {
    databaseStatus = "error";
    errorMessage = error instanceof Error ? error.message : "Unknown database error";
  }

  const status = databaseStatus === "ok" ? "ok" : "degraded";
  const body = {
    status,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "0.0.0",
    checks: {
      database: databaseStatus,
    },
  };

  const response = NextResponse.json(body, {
    status: databaseStatus === "ok" ? 200 : 503,
  });

  if (errorMessage) {
    response.headers.set("X-Health-Error", errorMessage);
  }

  return response;
}

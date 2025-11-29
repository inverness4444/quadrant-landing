import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { requireRole } from "@/services/rbac";
import { getQuarterDateRange } from "@/services/quarterlyReportService";
import { db } from "@/lib/db";
import { employees, talentDecisions, tracks } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

const querySchema = z.object({
  year: z.coerce.number().int(),
  quarter: z.coerce.number().int().min(1).max(4),
});

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const { start, end } = getQuarterDateRange(parsed.data.year, parsed.data.quarter as 1 | 2 | 3 | 4);
    const startMs = start.getTime();
    const endMs = end.getTime();
    const decisions = await db.select().from(talentDecisions).where(eq(talentDecisions.workspaceId, context.workspace.id));
    const employeeRows = await db.select().from(employees).where(eq(employees.workspaceId, context.workspace.id));
    const trackRows = await db.select().from(tracks).where(eq(tracks.workspaceId, context.workspace.id));
    const employeeMap = new Map(employeeRows.map((e) => [e.id, e]));
    const trackMap = new Map(trackRows.map((t) => [t.id, t.name]));
    const isInPeriod = (value: unknown) => {
      const ts = typeof value === "number" ? value : Date.parse(String(value));
      return Number.isFinite(ts) && ts >= startMs && ts <= endMs;
    };
    const filtered = decisions.filter((d) => isInPeriod(d.createdAt));
    const rows = filtered.map((d) => {
      const emp = employeeMap.get(d.employeeId);
      return {
        employeeName: emp?.name ?? "",
        teamName: emp?.primaryTrackId ? trackMap.get(emp.primaryTrackId) ?? "" : "",
        type: d.type,
        status: d.status,
        title: d.title,
        createdAt: new Date(d.createdAt).toISOString(),
        updatedAt: new Date(d.updatedAt ?? d.createdAt).toISOString(),
      };
    });
    const header = "employeeName,teamName,type,status,title,createdAt,updatedAt";
    const csvRows = rows.map((r) =>
      [r.employeeName, r.teamName, r.type, r.status, r.title?.replace(/"/g, "'"), r.createdAt, r.updatedAt]
        .map((field) => `"${(field ?? "")}"`)
        .join(","),
    );
    const csv = [header, ...csvRows].join("\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=quarterly-decisions-${parsed.data.year}-Q${parsed.data.quarter}.csv`,
      },
    });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "quarterly:decisions-csv" }));
  }
}

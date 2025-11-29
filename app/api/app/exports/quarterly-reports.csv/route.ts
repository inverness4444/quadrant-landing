import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError } from "@/services/apiError";
import { buildQuarterlyReportsExport } from "@/services/exportService";
import { toCsv } from "@/lib/csv";
import { requireRole } from "@/services/rbac";

const querySchema = z.object({ year: z.string().optional() });

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin", "hr", "manager"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const qs = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  try {
    const rows = await buildQuarterlyReportsExport({
      workspaceId: context.workspace.id,
      year: qs.year ? Number(qs.year) : undefined,
    });
    const csv = toCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=quadrant-quarterly-reports.csv",
      },
    });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "exports:quarterly-reports" }));
  }
}

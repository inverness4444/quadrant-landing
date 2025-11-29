import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import {
  generatePilotReportSections,
  generateTeamReportSections,
  generateWorkspaceReportSections,
  getReportById,
} from "@/services/reportService";
import { requireRole } from "@/services/rbac";
import { authRequiredError, forbiddenError, internalError, respondWithApiError, validationError } from "@/services/apiError";

type RouteParams = { params: { id: string } };

const bodySchema = z.object({
  mode: z.enum(["team", "pilot", "workspace"]).optional(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json ?? {});
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const report = await getReportById(params.id, context.workspace.id);
    if (!report) {
      return NextResponse.json({ ok: false, error: { message: "Отчёт не найден" } }, { status: 404 });
    }
    const mode = parsed.data.mode ?? report.type;
    if (mode === "team" && report.teamId) {
      await generateTeamReportSections({ reportId: report.id, workspaceId: context.workspace.id, teamId: report.teamId });
    } else if (mode === "pilot" && report.pilotRunId) {
      await generatePilotReportSections({ reportId: report.id, workspaceId: context.workspace.id, pilotRunId: report.pilotRunId });
    } else if (mode === "workspace") {
      await generateWorkspaceReportSections({ reportId: report.id, workspaceId: context.workspace.id });
    }
    const refreshed = await getReportById(report.id, context.workspace.id);
    return NextResponse.json({ ok: true, report: refreshed });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "reports:generate", reportId: params.id }));
  }
}

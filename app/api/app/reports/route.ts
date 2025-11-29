import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import {
  createEmptyReport,
  generatePilotReportSections,
  generateTeamReportSections,
  generateWorkspaceReportSections,
  getWorkspaceReports,
  getReportById,
} from "@/services/reportService";
import { requireRole } from "@/services/rbac";
import { authRequiredError, forbiddenError, internalError, respondWithApiError, validationError } from "@/services/apiError";

const createSchema = z.object({
  type: z.enum(["team", "pilot", "workspace"]),
  title: z.string().min(1),
  teamId: z.string().optional(),
  pilotRunId: z.string().optional(),
  autoGenerate: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  try {
    const reports = await getWorkspaceReports(context.workspace.id);
    return NextResponse.json({ ok: true, reports });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "reports:list" }));
  }
}

export async function POST(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const report = await createEmptyReport({
      workspaceId: context.workspace.id,
      type: parsed.data.type,
      title: parsed.data.title,
      context: { teamId: parsed.data.teamId, pilotRunId: parsed.data.pilotRunId },
      createdByUserId: context.user.id,
    });
    if (parsed.data.autoGenerate) {
      if (parsed.data.type === "team" && parsed.data.teamId) {
        await generateTeamReportSections({ reportId: report.id, workspaceId: context.workspace.id, teamId: parsed.data.teamId });
      } else if (parsed.data.type === "pilot" && parsed.data.pilotRunId) {
        await generatePilotReportSections({ reportId: report.id, workspaceId: context.workspace.id, pilotRunId: parsed.data.pilotRunId });
      } else if (parsed.data.type === "workspace") {
        await generateWorkspaceReportSections({ reportId: report.id, workspaceId: context.workspace.id });
      }
    }
    const refreshed = await getReportById(report.id, context.workspace.id);
    return NextResponse.json({ ok: true, report: refreshed ?? report });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "reports:create" }));
  }
}

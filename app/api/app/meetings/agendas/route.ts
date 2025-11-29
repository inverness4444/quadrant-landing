import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { createAgendaFromReport, getWorkspaceAgendas } from "@/services/meetingService";
import { requireRole } from "@/services/rbac";
import { authRequiredError, forbiddenError, internalError, respondWithApiError, validationError } from "@/services/apiError";

const schema = z.object({
  reportId: z.string(),
  type: z.enum(["team_review", "pilot_review", "exec_briefing"]),
  title: z.string().optional(),
  description: z.string().optional(),
  scheduledAt: z.string().optional(),
  durationMinutes: z.number().optional(),
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
    const agendas = await getWorkspaceAgendas(context.workspace.id);
    return NextResponse.json({ ok: true, agendas });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "meetings:list" }));
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
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const agenda = await createAgendaFromReport({
      workspaceId: context.workspace.id,
      reportId: parsed.data.reportId,
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined,
      durationMinutes: parsed.data.durationMinutes,
      createdByUserId: context.user.id,
    });
    return NextResponse.json({ ok: true, agenda });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "meetings:create" }));
  }
}

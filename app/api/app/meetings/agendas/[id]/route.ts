import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { getAgendaById, updateAgendaMeta } from "@/services/meetingService";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  notFoundError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";

type RouteParams = { params: { id: string } };

const patchSchema = z.object({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  scheduledAt: z.string().nullable().optional(),
  durationMinutes: z.number().nullable().optional(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  try {
    const agenda = await getAgendaById(params.id, context.workspace.id);
    if (!agenda) {
      return respondWithApiError(notFoundError("Повестка не найдена"));
    }
    return NextResponse.json({ ok: true, agenda });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "meetings:get", agendaId: params.id }));
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const agenda = await updateAgendaMeta({
      agendaId: params.id,
      workspaceId: context.workspace.id,
      title: parsed.data.title,
      description: parsed.data.description ?? undefined,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
      durationMinutes: parsed.data.durationMinutes ?? undefined,
    });
    if (!agenda) {
      return respondWithApiError(notFoundError("Повестка не найдена"));
    }
    return NextResponse.json({ ok: true, agenda });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "meetings:update", agendaId: params.id }));
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { addPilotRunNote, getPilotRunNotes } from "@/services/pilotService";
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

const noteSchema = z.object({
  type: z.enum(["meeting", "insight", "risk", "decision"]),
  title: z.string().min(1),
  body: z.string().min(1),
  relatedTeamId: z.string().optional(),
  relatedScenarioId: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  try {
    const notes = await getPilotRunNotes(params.id, context.workspace.id);
    if (!notes) {
      return respondWithApiError(notFoundError("Пилот не найден"));
    }
    return NextResponse.json({ ok: true, notes });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "pilot:runs:notes", pilotId: params.id }));
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const json = await request.json().catch(() => null);
  const parsed = noteSchema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const note = await addPilotRunNote({
      pilotRunId: params.id,
      workspaceId: context.workspace.id,
      authorUserId: context.user.id,
      type: parsed.data.type,
      title: parsed.data.title,
      body: parsed.data.body,
      relatedTeamId: parsed.data.relatedTeamId,
      relatedScenarioId: parsed.data.relatedScenarioId,
    });
    return NextResponse.json({ ok: true, note });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "pilot:runs:notes:create", pilotId: params.id }));
  }
}

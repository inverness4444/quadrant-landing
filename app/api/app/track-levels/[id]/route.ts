import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { findTrackLevelById, findTrackById, updateTrackLevel } from "@/repositories/trackRepository";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  notFoundError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";

const payloadSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(2).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const json = await request.json();
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  if (!parsed.data.name && !parsed.data.description) {
    return respondWithApiError(validationError({ general: ["Нет изменений"] }));
  }
  try {
    const existingLevel = await findTrackLevelById(id);
    if (!existingLevel) {
      return respondWithApiError(notFoundError("Уровень не найден"));
    }
    const track = await findTrackById(existingLevel.trackId);
    if (!track || track.workspaceId !== context.workspace.id) {
      return respondWithApiError(notFoundError("Уровень не найден"));
    }
    const level = await updateTrackLevel(id, parsed.data);
    return NextResponse.json({ ok: true, level });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "track-levels:update" }));
  }
}

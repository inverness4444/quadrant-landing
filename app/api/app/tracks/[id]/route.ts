import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { findTrackById, updateTrack } from "@/repositories/trackRepository";
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
  name: z.string().min(2),
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
  try {
    const existing = await findTrackById(id);
    if (!existing || existing.workspaceId !== context.workspace.id) {
      return respondWithApiError(notFoundError("Трек не найден"));
    }
    const track = await updateTrack(id, parsed.data);
    return NextResponse.json({ ok: true, track });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "tracks:update" }));
  }
}

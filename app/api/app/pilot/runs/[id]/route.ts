import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { getPilotRunById, updatePilotRunMeta } from "@/services/pilotService";
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
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["draft", "active", "completed", "archived"]).optional(),
  targetCycleId: z.string().nullable().optional(),
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
    const run = await getPilotRunById(params.id, context.workspace.id);
    if (!run) {
      return respondWithApiError(notFoundError("Пилот не найден"));
    }
    return NextResponse.json({ ok: true, run });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "pilot:runs:get", pilotId: params.id }));
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const run = await updatePilotRunMeta({
      pilotRunId: params.id,
      workspaceId: context.workspace.id,
      name: parsed.data.name,
      description: parsed.data.description,
      status: parsed.data.status,
      targetCycleId: parsed.data.targetCycleId ?? null,
    });
    if (!run) {
      return respondWithApiError(notFoundError("Пилот не найден"));
    }
    return NextResponse.json({ ok: true, run });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "pilot:runs:update", pilotId: params.id }));
  }
}

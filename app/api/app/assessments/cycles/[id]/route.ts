import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { getCycleById, updateCycle } from "@/services/assessmentService";
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

const updateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["draft", "active", "closed", "archived"]).optional(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  teamIds: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    const cycle = await getCycleById(params.id, context.workspace.id);
    if (!cycle) {
      return respondWithApiError(notFoundError("Цикл не найден"));
    }
    return NextResponse.json({ ok: true, cycle });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "assessments:cycles:get", cycleId: params.id }));
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
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const cycle = await updateCycle({
      cycleId: params.id,
      workspaceId: context.workspace.id,
      ...parsed.data,
    });
    if (!cycle) {
      return respondWithApiError(notFoundError("Цикл не найден"));
    }
    return NextResponse.json({ ok: true, cycle });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "assessments:cycles:update", cycleId: params.id }));
  }
}

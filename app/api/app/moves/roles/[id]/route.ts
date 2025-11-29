import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { getJobRoleById, updateJobRole } from "@/services/movesService";
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

const requirementSchema = z.object({
  skillId: z.string(),
  requiredLevel: z.number(),
  importance: z.enum(["must_have", "nice_to_have"]),
});

const updateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  levelBand: z.string().optional().nullable(),
  isLeadership: z.boolean().optional(),
  requirements: z.array(requirementSchema).optional(),
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
    const role = await getJobRoleById(params.id, context.workspace.id);
    if (!role) {
      return respondWithApiError(notFoundError("Роль не найдена"));
    }
    return NextResponse.json({ ok: true, role });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "moves:roles:get", roleId: params.id }));
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
    const role = await updateJobRole({
      jobRoleId: params.id,
      workspaceId: context.workspace.id,
      ...parsed.data,
    });
    if (!role) {
      return respondWithApiError(notFoundError("Роль не найдена"));
    }
    return NextResponse.json({ ok: true, role });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "moves:roles:update", roleId: params.id }));
  }
}

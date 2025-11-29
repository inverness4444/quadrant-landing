import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { createJobRole, getWorkspaceJobRoles } from "@/services/movesService";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";

const requirementSchema = z.object({
  skillId: z.string(),
  requiredLevel: z.number(),
  importance: z.enum(["must_have", "nice_to_have"]),
});

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  levelBand: z.string().optional().nullable(),
  isLeadership: z.boolean().optional(),
  requirements: z.array(requirementSchema).default([]),
});

export async function GET(request: NextRequest) {
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
    const roles = await getWorkspaceJobRoles(context.workspace.id);
    return NextResponse.json({ ok: true, roles });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "moves:roles:list" }));
  }
}

export async function POST(request: NextRequest) {
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
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const role = await createJobRole({
      workspaceId: context.workspace.id,
      ...parsed.data,
    });
    return NextResponse.json({ ok: true, role });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "moves:roles:create" }));
  }
}

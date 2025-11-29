import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError } from "@/services/apiError";
import { createWorkspaceProgram, listWorkspacePrograms } from "@/services/programService";
import { requireRole } from "@/services/rbac";

const createSchema = z.object({
  templateCode: z.string().min(1),
  name: z.string().min(1).optional(),
  descriptionOverride: z.string().optional(),
  targetEmployeeIds: z.array(z.string()).default([]),
  plannedEndAt: z.string().optional().nullable(),
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
    const programs = await listWorkspacePrograms(context.workspace.id);
    return NextResponse.json({ ok: true, programs });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "programs:list" }));
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
  try {
    const body = createSchema.parse(await request.json());
    const program = await createWorkspaceProgram({
      workspaceId: context.workspace.id,
      templateCode: body.templateCode,
      ownerId: context.user.id,
      name: body.name,
      descriptionOverride: body.descriptionOverride,
      targetEmployeeIds: body.targetEmployeeIds,
      plannedEndAt: body.plannedEndAt ?? undefined,
    });
    return NextResponse.json({ ok: true, program });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "programs:create" }));
  }
}

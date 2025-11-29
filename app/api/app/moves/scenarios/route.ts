import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { getWorkspaceMoveScenarios, saveMoveScenario } from "@/services/movesService";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";

const actionSchema = z.object({
  type: z.enum(["hire", "develop", "reassign", "promote", "backfill"]).optional(),
  teamId: z.string().optional().nullable(),
  fromEmployeeId: z.string().optional().nullable(),
  toEmployeeId: z.string().optional().nullable(),
  jobRoleId: z.string().optional().nullable(),
  skillId: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  actions: z.array(actionSchema).default([]),
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
    const scenarios = await getWorkspaceMoveScenarios(context.workspace.id);
    return NextResponse.json({ ok: true, scenarios });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "moves:scenarios:list" }));
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
    const scenario = await saveMoveScenario({
      workspaceId: context.workspace.id,
      createdByUserId: context.user.id,
      ...parsed.data,
    });
    return NextResponse.json({ ok: true, scenario });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "moves:scenarios:create" }));
  }
}

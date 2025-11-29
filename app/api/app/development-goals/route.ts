import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { requireMember, requireRole } from "@/services/rbac";
import { createOrUpdateGoal, getGoalsForEmployee } from "@/services/developmentPlanService";

const createSchema = z.object({
  goalId: z.string().optional(),
  employeeId: z.string(),
  title: z.string().min(2),
  description: z.string().optional(),
  status: z.enum(["active", "completed", "archived"]).optional(),
  priority: z.number().int().min(1).max(3).optional(),
  dueDate: z.string().optional().nullable(),
  targetSkillCode: z.string().optional().nullable(),
  targetLevel: z.number().int().min(1).max(5).optional().nullable(),
  roleProfileId: z.string().optional().nullable(),
});

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
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const goal = await createOrUpdateGoal({
      workspaceId: context.workspace.id,
      employeeId: parsed.data.employeeId,
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      priority: parsed.data.priority,
      dueDate: parsed.data.dueDate ?? null,
      targetSkillCode: parsed.data.targetSkillCode ?? null,
      targetLevel: parsed.data.targetLevel ?? null,
      roleProfileId: parsed.data.roleProfileId ?? null,
      goalId: parsed.data.goalId,
      createdBy: context.user.id,
    });
    return NextResponse.json({ ok: true, goal });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "development-goals:create" }));
  }
}

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireMember(context.workspace.id, context.user.id);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const employeeId = request.nextUrl.searchParams.get("employeeId");
  if (!employeeId) {
    return respondWithApiError(validationError({ employeeId: ["employeeId is required"] }));
  }
  const onlyActive = request.nextUrl.searchParams.get("onlyActive") === "true";
  const includeCheckins = request.nextUrl.searchParams.get("includeCheckins") !== "false";
  try {
    const data = await getGoalsForEmployee({
      workspaceId: context.workspace.id,
      employeeId,
      includeCheckins,
      onlyActive,
    });
    return NextResponse.json({ ok: true, goals: data.goals });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "development-goals:list" }));
  }
}

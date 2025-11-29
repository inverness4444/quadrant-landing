import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { createQuest, getWorkspaceQuests } from "@/services/questService";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  ownerEmployeeId: z.string(),
  relatedTeamId: z.string().optional().nullable(),
  goalType: z.enum(["reduce_risk", "develop_skill", "onboarding", "project_help", "other"]),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["draft", "active", "completed", "archived"]).optional(),
  templateId: z.string().optional().nullable(),
  steps: z
    .array(
      z.object({
        title: z.string().min(2),
        description: z.string().min(2),
        order: z.number(),
        required: z.boolean(),
        relatedSkillId: z.string().optional().nullable(),
        suggestedArtifactsCount: z.number().optional().nullable(),
      }),
    )
    .default([]),
});

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  const params = request.nextUrl.searchParams;
  const filters = {
    status: params.get("status") ?? undefined,
    teamId: params.get("teamId") ?? undefined,
    goalType: params.get("goalType") ?? undefined,
  };
  try {
    const quests = await getWorkspaceQuests(context.workspace.id, filters);
    return NextResponse.json({ ok: true, quests });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "quests:list" }));
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
    const quest = await createQuest({
      workspaceId: context.workspace.id,
      ...parsed.data,
    });
    return NextResponse.json({ ok: true, quest });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "quests:create" }));
  }
}

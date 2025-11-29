import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { getQuestById } from "@/services/questService";
import { requireRole } from "@/services/rbac";
import { db } from "@/lib/db";
import { quests } from "@/drizzle/schema";
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
  title: z.string().min(2).optional(),
  description: z.string().min(2).optional(),
  status: z.enum(["draft", "active", "completed", "archived"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  relatedTeamId: z.string().nullable().optional(),
  goalType: z.enum(["reduce_risk", "develop_skill", "onboarding", "project_help", "other"]).optional(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    const quest = await getQuestById(params.id, context.workspace.id);
    if (!quest) {
      return respondWithApiError(notFoundError("Квест не найден"));
    }
    return NextResponse.json({ ok: true, quest });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "quests:get", questId: params.id }));
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
    const quest = await getQuestById(params.id, context.workspace.id);
    if (!quest) {
      return respondWithApiError(notFoundError("Квест не найден"));
    }
    db.update(quests)
      .set({
        ...parsed.data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(quests.id, params.id))
      .run();
    const updated = await getQuestById(params.id, context.workspace.id);
    return NextResponse.json({ ok: true, quest: updated });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "quests:update", questId: params.id }));
  }
}

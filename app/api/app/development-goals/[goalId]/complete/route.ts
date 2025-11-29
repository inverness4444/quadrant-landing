import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { requireMember } from "@/services/rbac";
import { markGoalCompleted } from "@/services/developmentPlanService";

const schema = z.object({
  goalId: z.string(),
});

export async function POST(request: NextRequest, { params }: { params: { goalId: string } }) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireMember(context.workspace.id, context.user.id);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const parsed = schema.safeParse({ goalId: params.goalId });
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const goal = await markGoalCompleted({
      workspaceId: context.workspace.id,
      goalId: parsed.data.goalId,
      completedBy: context.user.id,
    });
    return NextResponse.json({ ok: true, goal });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "development-goals:complete" }));
  }
}

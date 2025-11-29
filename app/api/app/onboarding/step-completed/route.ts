import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError } from "@/services/apiError";
import { assertStep, markStepCompleted } from "@/services/onboardingService";
import { requireRole } from "@/services/rbac";

const bodySchema = z.object({
  step: z.string().min(1),
  setCurrentStepToNext: z.boolean().optional(),
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
  try {
    const json = await request.json();
    const parsed = bodySchema.parse(json);
    const step = assertStep(parsed.step);
    const state = await markStepCompleted({
      workspaceId: context.workspace.id,
      step,
      setCurrentStepToNext: parsed.setCurrentStepToNext,
    });
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "onboarding:step-completed" }));
  }
}

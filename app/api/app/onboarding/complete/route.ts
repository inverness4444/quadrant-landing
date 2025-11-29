import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError } from "@/services/apiError";
import { completeOnboarding } from "@/services/onboardingService";
import { requireRole } from "@/services/rbac";

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
    const state = await completeOnboarding(context.workspace.id);
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "onboarding:complete" }));
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { requireMember, requireRole } from "@/services/rbac";
import {
  markOnboardingStepManually,
  recomputeOnboardingState,
} from "@/services/onboardingService";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";
import type { OnboardingSteps } from "@/drizzle/schema";

const STEP_KEYS: Array<keyof OnboardingSteps> = [
  "invitedMembers",
  "createdEmployee",
  "createdSkill",
  "createdTrack",
  "connectedIntegration",
];

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
  try {
    const state = await recomputeOnboardingState(context.workspace.id);
    return NextResponse.json(state);
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "app_onboarding_get" }));
  }
}

export async function PATCH(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  let stepKey: keyof OnboardingSteps | null = null;
  try {
    const payload = (await request.json()) as { step?: string };
    if (payload.step && STEP_KEYS.includes(payload.step as keyof OnboardingSteps)) {
      stepKey = payload.step as keyof OnboardingSteps;
    }
  } catch {
    // ignore parsing issues
  }
  if (!stepKey) {
    return respondWithApiError(validationError({ step: ["invalid_step"] }));
  }
  try {
    const state = await markOnboardingStepManually(context.workspace.id, stepKey);
    return NextResponse.json(state);
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "app_onboarding_patch" }));
  }
}

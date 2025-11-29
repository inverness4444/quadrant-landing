import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { onboardingStepsEnum, workspaceOnboardingState, type OnboardingStep, type WorkspaceOnboardingState } from "@/drizzle/schema";

const stepOrder: OnboardingStep[] = [
  "company_info",
  "roles_skills",
  "employees",
  "focus_teams",
  "pilots",
  "feedback",
  "review",
];

function nextStep(current: OnboardingStep): OnboardingStep {
  const idx = stepOrder.indexOf(current);
  if (idx === -1 || idx === stepOrder.length - 1) return "review";
  return stepOrder[idx + 1];
}

function mergeCompleted(completed: string[], step: OnboardingStep) {
  const set = new Set(completed);
  set.add(step);
  return Array.from(set);
}

export async function getOnboardingState(workspaceId: string): Promise<WorkspaceOnboardingState> {
  const existingRows = await db.select().from(workspaceOnboardingState).where(eq(workspaceOnboardingState.workspaceId, workspaceId));
  if (existingRows.length > 0) return existingRows[0];
  const state = {
    id: randomUUID(),
    workspaceId,
    isCompleted: false,
    currentStep: "company_info" as OnboardingStep,
    completedSteps: "[]",
    lastUpdatedAt: new Date().toISOString(),
  };
  await db.insert(workspaceOnboardingState).values(state).run();
  return state;
}

export async function markStepCompleted(input: { workspaceId: string; step: OnboardingStep; setCurrentStepToNext?: boolean }) {
  const state = await getOnboardingState(input.workspaceId);
  const completedArray: OnboardingStep[] = JSON.parse(state.completedSteps || "[]");
  const merged = mergeCompleted(completedArray, input.step);
  const newCurrent = input.setCurrentStepToNext ? nextStep(input.step) : state.currentStep;
  await db
    .update(workspaceOnboardingState)
    .set({
      completedSteps: JSON.stringify(merged),
      currentStep: newCurrent,
      lastUpdatedAt: new Date().toISOString(),
    })
    .where(eq(workspaceOnboardingState.workspaceId, input.workspaceId))
    .run();
  return getOnboardingState(input.workspaceId);
}

export async function completeOnboarding(workspaceId: string) {
  await db
    .update(workspaceOnboardingState)
    .set({
      isCompleted: true,
      currentStep: "review",
      completedSteps: JSON.stringify(stepOrder),
      lastUpdatedAt: new Date().toISOString(),
    })
    .where(eq(workspaceOnboardingState.workspaceId, workspaceId))
    .run();
  return getOnboardingState(workspaceId);
}

export async function isOnboardingCompleted(workspaceId: string) {
  const state = await getOnboardingState(workspaceId);
  return Boolean(state.isCompleted);
}

export function assertStep(step: string): OnboardingStep {
  if (onboardingStepsEnum.includes(step as OnboardingStep)) {
    return step as OnboardingStep;
  }
  throw new Error("INVALID_STEP");
}

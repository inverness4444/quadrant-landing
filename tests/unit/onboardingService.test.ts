import { describe, expect, it, beforeEach } from "vitest";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { workspaceOnboardingState } from "@/drizzle/schema";
import { completeOnboarding, getOnboardingState, markStepCompleted } from "@/services/onboardingService";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";

const workspaceId = randomUUID();

describe("onboardingService", () => {
  beforeEach(async () => {
    await resetWorkspaceData();
    await db.delete(workspaceOnboardingState).run();
  });

  it("creates default state if missing", async () => {
    const state = await getOnboardingState(workspaceId);
    expect(state.workspaceId).toBe(workspaceId);
    expect(state.isCompleted).toBe(false);
    expect(state.currentStep).toBe("company_info");
  });

  it("marks step completed and moves forward", async () => {
    await getOnboardingState(workspaceId);
    const updated = await markStepCompleted({ workspaceId, step: "company_info", setCurrentStepToNext: true });
    expect(JSON.parse(updated.completedSteps)).toContain("company_info");
    expect(updated.currentStep).toBe("roles_skills");
  });

  it("completes onboarding", async () => {
    const completed = await completeOnboarding(workspaceId);
    expect(completed.isCompleted).toBe(true);
    expect(completed.currentStep).toBe("review");
    const steps = JSON.parse(completed.completedSteps);
    expect(steps.length).toBeGreaterThanOrEqual(6);
  });
});

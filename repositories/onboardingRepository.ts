import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { onboardingStates } from "@/drizzle/schema";

const now = () => new Date().toISOString();

export async function findOnboardingStateByWorkspace(workspaceId: string) {
  return db.query.onboardingStates.findFirst({
    where: eq(onboardingStates.workspaceId, workspaceId),
  });
}

export async function createOnboardingState(workspaceId: string, data?: { steps?: string; isCompleted?: boolean }) {
  const timestamp = now();
  await db
    .insert(onboardingStates)
    .values({
      id: randomUUID(),
      workspaceId,
      steps: data?.steps ?? "{}",
      isCompleted: data?.isCompleted ?? false,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();
  return findOnboardingStateByWorkspace(workspaceId);
}

export async function updateOnboardingState(workspaceId: string, data: { steps: string; isCompleted: boolean }) {
  await db
    .update(onboardingStates)
    .set({
      steps: data.steps,
      isCompleted: data.isCompleted,
      updatedAt: now(),
    })
    .where(eq(onboardingStates.workspaceId, workspaceId))
    .run();
  return findOnboardingStateByWorkspace(workspaceId);
}

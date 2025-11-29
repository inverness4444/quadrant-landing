import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createMember } from "@/repositories/memberRepository";
import { createTrack } from "@/repositories/trackRepository";
import {
  createPilotRun,
  getPilotRunById,
  getWorkspacePilotRuns,
  updatePilotRunStepStatus,
} from "@/services/pilotService";

async function createWorkspaceWithOwner() {
  const plan = await ensureDefaultTestPlan();
  const user = await createUser({
    email: `pilot-${randomUUID()}@example.com`,
    passwordHash: "hash",
    name: "Pilot Owner",
  });
  const workspace = await createWorkspace({
    name: "Pilot WS",
    ownerUserId: user.id,
    planId: plan?.id ?? null,
  });
  await createMember({ userId: user.id, workspaceId: workspace.id, role: "owner" });
  return { workspaceId: workspace.id, userId: user.id };
}

describe("pilotService (playbook)", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("creates pilot run with default playbook steps", async () => {
    const { workspaceId, userId } = await createWorkspaceWithOwner();
    const track = await createTrack(workspaceId, { name: "Команда пилота", levels: [{ name: "L1", description: "" }] });
    const run = await createPilotRun({
      workspaceId,
      name: "Пилот Quadrant",
      description: "Тестовый пилот",
      ownerUserId: userId,
      teamIds: track ? [track.id] : [],
    });
    expect(run.steps.length).toBeGreaterThanOrEqual(6);
    expect(run.summaryProgress.totalSteps).toBe(run.steps.length);
  });

  it("updates step status and recalculates summary", async () => {
    const { workspaceId, userId } = await createWorkspaceWithOwner();
    const run = await createPilotRun({
      workspaceId,
      name: "Пилот Quadrant",
      description: "Тестовый пилот",
      ownerUserId: userId,
      teamIds: [],
    });
    const step = run.steps[0];
    const updated = await updatePilotRunStepStatus({
      pilotRunId: run.id,
      stepId: step.id,
      workspaceId,
      status: "done",
    });
    expect(updated?.status).toBe("done");
    const refreshed = await getPilotRunById(run.id, workspaceId);
    expect(refreshed?.summaryProgress.completedSteps).toBe(1);
  });

  it("returns pilot runs list with summary", async () => {
    const { workspaceId, userId } = await createWorkspaceWithOwner();
    await createPilotRun({
      workspaceId,
      name: "Пилот Quadrant",
      description: "Тестовый пилот",
      ownerUserId: userId,
      teamIds: [],
    });
    const runs = await getWorkspacePilotRuns(workspaceId);
    expect(runs.length).toBe(1);
    expect(runs[0]?.summaryProgress.percent).toBeGreaterThanOrEqual(0);
  });
});

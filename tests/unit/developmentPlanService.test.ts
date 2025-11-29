import { randomUUID } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { employees } from "@/drizzle/schema";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createMember } from "@/repositories/memberRepository";
import { createUser } from "@/repositories/userRepository";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import {
  addCheckin,
  createOrUpdateGoal,
  getGoalsForEmployee,
  markGoalCompleted,
} from "@/services/developmentPlanService";

describe("developmentPlanService", () => {
  let workspaceId: string;
  let employeeId: string;
  let userId: string;

  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
    const plan = await ensureDefaultTestPlan();
    const user = await createUser({ email: `devplan+${randomUUID()}@example.com`, passwordHash: "hash", name: "Manager" });
    userId = user.id;
    const ws = await createWorkspace({ name: "WS", ownerUserId: userId, planId: plan?.id });
    workspaceId = ws.id;
    await createMember({ userId, workspaceId, role: "owner" });
    employeeId = randomUUID();
    db.insert(employees)
      .values({
        id: employeeId,
        workspaceId,
        name: "Employee",
        position: "Dev",
        level: "Middle",
        primaryTrackId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
  });

  it("creates and updates development goal", async () => {
    const created = await createOrUpdateGoal({
      workspaceId,
      employeeId,
      title: "Grow",
      createdBy: userId,
    });
    expect(created.id).toBeTruthy();
    expect(created.status).toBe("active");

    const updated = await createOrUpdateGoal({
      workspaceId,
      employeeId,
      title: "Grow faster",
      description: "desc",
      goalId: created.id,
      status: "completed",
      priority: 1,
      createdBy: userId,
    });
    expect(updated.title).toBe("Grow faster");
    expect(updated.status).toBe("completed");
    expect(updated.priority).toBe(1);
  });

  it("adds checkin and returns goals", async () => {
    const goal = await createOrUpdateGoal({ workspaceId, employeeId, title: "Skill", createdBy: userId });
    const checkin = await addCheckin({
      workspaceId,
      employeeId,
      goalId: goal.id,
      createdBy: userId,
      note: "Progress",
      status: "on_track",
    });
    expect(checkin.goalId).toBe(goal.id);

    const goals = await getGoalsForEmployee({ workspaceId, employeeId, includeCheckins: true });
    expect(goals.goals.length).toBe(1);
    expect(goals.goals[0]?.checkins?.length).toBe(1);
  });

  it("filters only active goals", async () => {
    await createOrUpdateGoal({ workspaceId, employeeId, title: "Active", createdBy: userId, status: "active" });
    await createOrUpdateGoal({ workspaceId, employeeId, title: "Archived", createdBy: userId, status: "archived" });
    const active = await getGoalsForEmployee({ workspaceId, employeeId, onlyActive: true });
    expect(active.goals.length).toBe(1);
  });

  it("marks goal completed", async () => {
    const goal = await createOrUpdateGoal({ workspaceId, employeeId, title: "Complete", createdBy: userId });
    const updated = await markGoalCompleted({ workspaceId, goalId: goal.id, completedBy: userId });
    expect(updated.status).toBe("completed");
  });
});

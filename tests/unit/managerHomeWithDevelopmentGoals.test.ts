import { randomUUID } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  developmentGoals,
  employees,
  tracks,
} from "@/drizzle/schema";
import { getManagerHome } from "@/services/managerHomeService";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createMember } from "@/repositories/memberRepository";
import { createUser } from "@/repositories/userRepository";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";

describe("managerHomeService with development goals", () => {
  let workspaceId: string;
  let userId: string;
  let teamId: string;
  let employeeId: string;

  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
    const plan = await ensureDefaultTestPlan();
    const user = await createUser({ email: `mgrdev+${randomUUID()}@example.com`, passwordHash: "hash", name: "Manager" });
    userId = user.id;
    const workspace = await createWorkspace({ name: "Manager WS", ownerUserId: userId, size: "10-50", planId: plan?.id });
    workspaceId = workspace.id;
    await createMember({ userId, workspaceId, role: "owner" });
    teamId = randomUUID();
    db.insert(tracks)
      .values({ id: teamId, workspaceId, name: "Team A", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .run();
    employeeId = randomUUID();
    db.insert(employees)
      .values({
        id: employeeId,
        workspaceId,
        name: "Engineer",
        position: "Dev",
        level: "Middle",
        primaryTrackId: teamId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();

    db.insert(developmentGoals)
      .values({
        id: randomUUID(),
        workspaceId,
        employeeId,
        title: "Improve skill",
        description: null,
        status: "active",
        priority: 1,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        targetSkillCode: "frontend.react",
        targetLevel: 4,
        roleProfileId: null,
      })
      .run();
  });

  it("includes development goal action items", async () => {
    const result = await getManagerHome({ workspaceId, userId });
    const devAction = result.actions.find((a) => a.kind === "development_goal");
    expect(devAction).toBeTruthy();
    expect(devAction?.employeeId).toBe(employeeId);
    expect(devAction?.priority).toBe("high");
  });
});

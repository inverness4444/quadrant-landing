import { randomUUID } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { employees, pilotRuns, tracks } from "@/drizzle/schema";
import { createMember } from "@/repositories/memberRepository";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import { getManagerHome } from "@/services/managerHomeService";

describe("managerHomeService pilot actions", () => {
  let workspaceId: string;
  let userId: string;
  let teamId: string;

  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
    const plan = await ensureDefaultTestPlan();
    const user = await createUser({ email: `mgr+${randomUUID()}@example.com`, passwordHash: "hash", name: "Manager Pilot" });
    userId = user.id;
    const ws = await createWorkspace({ name: "WS", ownerUserId: userId, planId: plan?.id });
    workspaceId = ws.id;
    await createMember({ userId, workspaceId, role: "owner" });
    teamId = randomUUID();
    db.insert(tracks)
      .values({ id: teamId, workspaceId, name: "Team", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .run();
    db.insert(employees)
      .values({
        id: randomUUID(),
        workspaceId,
        name: "Manager Pilot",
        position: "Lead",
        level: "Senior",
        primaryTrackId: teamId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
  });

  it("returns pilot actions when pilot ending soon", async () => {
    const pilotId = randomUUID();
    const endDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    db.insert(pilotRuns)
      .values({
        id: pilotId,
        workspaceId,
        name: "Pilot Ending",
        description: null,
        status: "active",
        ownerUserId: userId,
        targetCycleId: null,
        templateId: null,
        origin: "manual",
        startDate: new Date().toISOString(),
        endDate,
        targetAudience: null,
        successCriteria: null,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();

    const result = await getManagerHome({ workspaceId, userId });
    const reviewAction = result.actions.find((a) => a.kind === "review_pilot" && a.pilotId === pilotId);
    expect(reviewAction).toBeTruthy();
    expect(reviewAction?.url).toContain(pilotId);
  });
});

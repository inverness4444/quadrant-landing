import { randomUUID } from "crypto";
import { describe, expect, it, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { employees, pilotRunSteps, pilotRuns } from "@/drizzle/schema";
import { createMember } from "@/repositories/memberRepository";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { createRiskCase } from "@/services/riskCenterService";
import { getManagerCommandCenterSnapshot } from "@/services/managerCommandCenterService";

async function seedWorkspace() {
  await ensureDefaultTestPlan();
  const user = await createUser({ email: `manager-${randomUUID()}@example.com`, passwordHash: "hash", name: "Manager" });
  const ws = await createWorkspace({ name: "Manager WS", ownerUserId: user.id, planId: null });
  await createMember({ userId: user.id, workspaceId: ws.id, role: "owner" });
  const timestamp = new Date().toISOString();
  const employeeId = randomUUID();
  const employeeId2 = randomUUID();
  db.insert(employees)
    .values({
      id: employeeId,
      workspaceId: ws.id,
      name: "Alice",
      position: "Dev",
      level: "Middle",
      primaryTrackId: null,
      trackLevelId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();
  db.insert(employees)
    .values({
      id: employeeId2,
      workspaceId: ws.id,
      name: "Bob",
      position: "QA",
      level: "Middle",
      primaryTrackId: null,
      trackLevelId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();
  return { ws, user, employeeId, employeeId2 };
}

describe("managerCommandCenterService", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("aggregates summary, risks and pilots", async () => {
    const { ws, user, employeeId } = await seedWorkspace();
    await createRiskCase({
      workspaceId: ws.id,
      employeeId,
      level: "high",
      source: "manual",
      title: "В зоне риска",
      ownerUserId: user.id,
    });
    const pilotId = randomUUID();
    const now = new Date().toISOString();
    db.insert(pilotRuns)
      .values({
        id: pilotId,
        workspaceId: ws.id,
        name: "Pilot A",
        description: null,
        status: "active",
        ownerUserId: user.id,
        targetCycleId: null,
        templateId: null,
        origin: "template",
        createdAt: now,
        updatedAt: now,
      })
      .run();
    db.insert(pilotRunSteps)
      .values({
        id: randomUUID(),
        pilotRunId: pilotId,
        key: "step1",
        title: "Шаг 1",
        description: null,
        orderIndex: 0,
        status: "pending",
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        completedAt: null,
      })
      .run();

    const snapshot = await getManagerCommandCenterSnapshot({ workspaceId: ws.id, managerUserId: user.id, lookaheadDays: 7 });
    expect(snapshot.summary.employeesTotal).toBe(2);
    expect(snapshot.summary.employeesAtRisk).toBe(1);
    expect(snapshot.summary.pilotsActive).toBe(1);
    expect(snapshot.summary.pilotsFromTemplates).toBe(1);
    expect(snapshot.summary.pilotStepsOverdue).toBe(1);
    expect(snapshot.risks.length).toBeGreaterThan(0);
    expect(snapshot.pilots.length).toBe(1);
  });
});

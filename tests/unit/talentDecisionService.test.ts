import { randomUUID } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { employees } from "@/drizzle/schema";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import { createDecision, listDecisions, updateDecisionStatus } from "@/services/talentDecisionService";

describe("talentDecisionService", () => {
  let workspaceId: string;
  let employeeId: string;
  let userId: string;

  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
    const plan = await ensureDefaultTestPlan();
    const user = await createUser({ email: `decision+${randomUUID()}@example.com`, passwordHash: "hash", name: "HR" });
    userId = user.id;
    const workspace = await createWorkspace({ name: "Decisions WS", ownerUserId: user.id, size: "10-50", planId: plan?.id });
    workspaceId = workspace.id;
    employeeId = randomUUID();
    db.insert(employees)
      .values({
        id: employeeId,
        workspaceId,
        name: "Employee A",
        position: "Backend",
        level: "Middle",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
  });

  it("creates and lists decisions", async () => {
    const decision = await createDecision({
      workspaceId,
      createdByUserId: userId,
      employeeId,
      type: "promote",
      sourceType: "manual",
      title: "Повысить до Senior",
      rationale: "Результаты пилота",
    });
    expect(decision.id).toBeDefined();
    const list = await listDecisions({ workspaceId, filters: { employeeId } });
    expect(list.length).toBe(1);
    expect(list[0]?.title).toContain("Повысить");
  });

  it("updates decision status", async () => {
    const decision = await createDecision({
      workspaceId,
      createdByUserId: userId,
      employeeId,
      type: "monitor_risk",
      sourceType: "manual",
      title: "Следить за выгоранием",
      rationale: "Мало артефактов",
    });
    const updated = await updateDecisionStatus({ workspaceId, userId, decisionId: decision.id, status: "approved" });
    expect(updated.status).toBe("approved");
  });

  it("filters by status and type", async () => {
    await createDecision({
      workspaceId,
      createdByUserId: userId,
      employeeId,
      type: "promote",
      sourceType: "manual",
      title: "Повышение",
      rationale: "Хорошие результаты",
    });
    await createDecision({
      workspaceId,
      createdByUserId: userId,
      employeeId,
      type: "monitor_risk",
      sourceType: "manual",
      title: "Риск ухода",
      rationale: "Низкая вовлеченность",
    });
    const onlyRisk = await listDecisions({ workspaceId, filters: { type: "monitor_risk" } });
    expect(onlyRisk.length).toBe(1);
    const open = await listDecisions({ workspaceId, filters: { onlyOpen: true } });
    expect(open.length).toBeGreaterThan(0);
  });
});

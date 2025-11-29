import { randomUUID } from "crypto";
import { describe, expect, it, beforeEach } from "vitest";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createMember } from "@/repositories/memberRepository";
import { db } from "@/lib/db";
import { employees } from "@/drizzle/schema";
import {
  createRiskCase,
  listRiskCases,
  updateRiskCaseStatus,
  getRiskCasesForEmployee,
} from "@/services/riskCenterService";

async function seedWorkspace() {
  await ensureDefaultTestPlan();
  const user = await createUser({ email: `risk+${randomUUID()}@example.com`, passwordHash: "hash", name: "Risk Owner" });
  const ws = await createWorkspace({ name: "Risk WS", ownerUserId: user.id, size: "10-50", planId: null });
  await createMember({ userId: user.id, workspaceId: ws.id, role: "owner" });
  const employeeId = randomUUID();
  const timestamp = new Date().toISOString();
  db.insert(employees)
    .values({
      id: employeeId,
      workspaceId: ws.id,
      name: "At Risk",
      position: "Engineer",
      level: "Middle",
      primaryTrackId: null,
      trackLevelId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();
  return { ws, user, employeeId };
}

describe("riskCenterService", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("creates risk case and lists with filters", async () => {
    const { ws, user, employeeId } = await seedWorkspace();
    const created = await createRiskCase({
      workspaceId: ws.id,
      employeeId,
      level: "high",
      source: "manual",
      title: "Риск выгорания",
      ownerUserId: user.id,
    });
    expect(created.id).toBeTruthy();
    expect(created.status).toBe("open");
    const list = await listRiskCases({ workspaceId: ws.id, statuses: ["open"] });
    expect(list.total).toBe(1);
    expect(list.highCount).toBeGreaterThanOrEqual(1);
    expect(list.items[0].employeeId).toBe(employeeId);

    const owned = await listRiskCases({ workspaceId: ws.id, statuses: ["open"], ownerUserId: user.id });
    expect(owned.total).toBe(1);
  });

  it("updates status to resolved and sets resolvedAt", async () => {
    const { ws, employeeId } = await seedWorkspace();
    const created = await createRiskCase({
      workspaceId: ws.id,
      employeeId,
      level: "medium",
      source: "engine",
      title: "Bus factor",
    });
    const updated = await updateRiskCaseStatus({
      workspaceId: ws.id,
      caseId: created.id,
      status: "resolved",
      resolutionNote: "Handled",
      resolvedByUserId: null,
    });
    expect(updated.status).toBe("resolved");
    const row = await db.query.riskCases.findFirst({ where: (fields, { eq: eqFn }) => eqFn(fields.id, created.id) });
    expect(row?.resolvedAt).toBeTruthy();
  });

  it("returns cases for employee with onlyOpen filter", async () => {
    const { ws, employeeId } = await seedWorkspace();
    const caseA = await createRiskCase({
      workspaceId: ws.id,
      employeeId,
      level: "medium",
      source: "manual",
      title: "Мониторинг",
    });
    await updateRiskCaseStatus({ workspaceId: ws.id, caseId: caseA.id, status: "monitoring" });
    await createRiskCase({
      workspaceId: ws.id,
      employeeId,
      level: "low",
      source: "manual",
      title: "Закрытый",
    });
    const openCases = await getRiskCasesForEmployee({ workspaceId: ws.id, employeeId, onlyOpen: true });
    expect(openCases.length).toBe(2);
  });
});

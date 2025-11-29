/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { employees, pilotRuns, talentDecisions, quarterlyReports } from "@/drizzle/schema";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createMember } from "@/repositories/memberRepository";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import {
  computeQuarterlyMetrics,
  getOrCreateQuarterlyReport,
  getQuarterDateRange,
  getQuarterlyReportWithMetrics,
} from "@/services/quarterlyReportService";

async function seedWorkspace() {
  const plan = await ensureDefaultTestPlan();
  const user = await createUser({ email: `quarterly+${randomUUID()}@example.com`, passwordHash: "hash", name: "Quarterly" });
  const workspace = await createWorkspace({ name: "Quarterly WS", ownerUserId: user.id, size: "10-50", planId: plan?.id });
  await createMember({ userId: user.id, workspaceId: workspace.id, role: "owner" });
  return { user, workspace };
}

describe("quarterlyReportService", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("creates report record on demand", async () => {
    const { workspace } = await seedWorkspace();
    const report = await getOrCreateQuarterlyReport({ workspaceId: workspace.id, year: 2024, quarter: 1 });
    expect(report.id).toBeTruthy();
    expect(report.title).toContain("Q1 2024");
  });

  it("computes metrics for pilots and decisions", async () => {
    const { workspace } = await seedWorkspace();
    const { start } = getQuarterDateRange(2024, 1);
    const createdAt = start.toISOString();
    const decisionDate = new Date(start);
    db.insert(pilotRuns)
      .values({
        id: randomUUID(),
        workspaceId: workspace.id,
        name: "Pilot A",
        description: null,
        status: "completed",
        ownerUserId: workspace.ownerUserId,
        targetCycleId: null,
        createdAt,
        updatedAt: createdAt,
      })
      .run();
    const employeeId = randomUUID();
    db.insert(employees)
      .values({
        id: employeeId,
        workspaceId: workspace.id,
        name: "Employee",
        position: "Role",
        level: "Middle",
        primaryTrackId: null,
        createdAt,
        updatedAt: createdAt,
      })
      .run();
    db.insert(talentDecisions)
      .values({
        id: randomUUID(),
        workspaceId: workspace.id,
        employeeId,
        type: "promote",
        sourceType: "manual",
        sourceId: null,
        status: "implemented",
        priority: "medium",
        title: "Promote",
        rationale: "Great work",
        risks: null,
        timeframe: null,
        createdByUserId: workspace.ownerUserId,
        createdAt: decisionDate,
        updatedAt: decisionDate,
      })
      .run();

    const metrics = await computeQuarterlyMetrics({ workspaceId: workspace.id, year: 2024, quarter: 1 });
    expect(metrics.pilotsTotal).toBe(1);
    expect(metrics.decisionsImplemented).toBe(1);
    expect(metrics.promotionsCount).toBe(1);
    expect(metrics.employeesTouched).toBe(1);
  });

  it("creates payload and reuses it on subsequent calls", async () => {
    const { workspace, user } = await seedWorkspace();
    const { start } = getQuarterDateRange(2024, 2);
    const createdAt = start.toISOString();
    const decisionDate = new Date(start);
    const employeeId = randomUUID();
    db.insert(employees)
      .values({
        id: employeeId,
        workspaceId: workspace.id,
        name: "Payload User",
        position: "Role",
        level: "Middle",
        primaryTrackId: null,
        createdAt,
        updatedAt: createdAt,
      })
      .run();
    db.insert(talentDecisions)
      .values({
        id: randomUUID(),
        workspaceId: workspace.id,
        employeeId,
        type: "monitor_risk",
        sourceType: "manual",
        sourceId: null,
        status: "proposed",
        priority: "medium",
        title: "Risk",
        rationale: "",
        risks: null,
        timeframe: null,
        createdByUserId: user.id,
        createdAt: decisionDate,
        updatedAt: decisionDate,
      })
      .run();

    const { summary: summary1, meta } = await getQuarterlyReportWithMetrics({ workspaceId: workspace.id, year: 2024, quarter: 2, userId: user.id });
    expect(summary1.metrics.employeesTotal).toBe(1);
    // подменяем payload чтобы убедиться, что последующий вызов берёт его
    db.update(quarterlyReports)
      .set({ payload: summary1 as any })
      .where(eq(quarterlyReports.id, meta.id!))
      .run();
    const { summary: summary2 } = await getQuarterlyReportWithMetrics({ workspaceId: workspace.id, year: 2024, quarter: 2, userId: user.id });
    expect(summary2.metrics.employeesTotal).toBe(1);
  });
});

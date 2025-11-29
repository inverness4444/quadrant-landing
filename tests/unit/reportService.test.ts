import { randomUUID } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { seedWorkspaceDemoData } from "@/services/workspaceSeed";
import { getExportData, getPilotDetailedReport, getWorkspaceSnapshotReport } from "@/services/reportService";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";

describe("reportService", () => {
  let workspaceId: string;

  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
    const plan = await ensureDefaultTestPlan();
    const user = await createUser({
      email: `reports-${randomUUID()}@example.com`,
      passwordHash: "hash",
      name: "Reports Tester",
    });
    const workspace = await createWorkspace({
      name: "Reports Demo",
      ownerUserId: user.id,
      size: "20-100",
      planId: plan?.id,
    });
    workspaceId = workspace.id;
    await seedWorkspaceDemoData(workspaceId);
  });

  it("builds workspace snapshot report with summary and pilot info", async () => {
    const report = await getWorkspaceSnapshotReport(workspaceId);
    expect(report.workspaceId).toBe(workspaceId);
    expect(report.totalEmployees).toBeGreaterThan(0);
    expect(report.totalIntegrations).toBeGreaterThanOrEqual(0);
    expect(report.totalArtifacts).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(report.topArtifactContributors)).toBe(true);
    expect(report.topSkills.length).toBeGreaterThan(0);
    expect(report.summary).toMatch(/workspace/i);
  });

  it("returns detailed pilot report with steps and next actions", async () => {
    const report = await getPilotDetailedReport(workspaceId);
    expect(report).not.toBeNull();
    expect(report?.steps.length).toBeGreaterThan(0);
    expect(report?.nextSteps.length).toBeGreaterThan(0);
  });

  it("returns null when pilot does not exist for workspace", async () => {
    const plan = await ensureDefaultTestPlan();
    const user = await createUser({
      email: `nopilot-${randomUUID()}@example.com`,
      passwordHash: "hash",
      name: "No Pilot",
    });
    const workspace = await createWorkspace({
      name: "Empty Workspace",
      ownerUserId: user.id,
      size: "5-10",
      planId: plan?.id,
    });
    const report = await getPilotDetailedReport(workspace.id);
    expect(report).toBeNull();
  });

  it("exports data respecting requested sections", async () => {
    const exportData = await getExportData(workspaceId, {
      includeEmployees: true,
      includeSkills: false,
      includeLinks: true,
    });
    expect(exportData.employees).toBeDefined();
    expect(exportData.skills).toBeUndefined();
    expect(exportData.links).toBeDefined();
  });
});

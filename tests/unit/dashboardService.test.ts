import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createMember } from "@/repositories/memberRepository";
import { createTrack } from "@/repositories/trackRepository";
import { db } from "@/lib/db";
import { employees, meetingAgendas, pilotRunSteps, pilotRunTeams, pilotRuns, reports } from "@/drizzle/schema";
import { getDashboardData } from "@/services/dashboardService";

async function setupWorkspace() {
  const plan = await ensureDefaultTestPlan();
  const user = await createUser({
    email: `dash-${randomUUID()}@example.com`,
    passwordHash: "hash",
    name: "Dash Owner",
  });
  const workspace = await createWorkspace({
    name: "Dash WS",
    ownerUserId: user.id,
    planId: plan?.id ?? null,
  });
  await createMember({ userId: user.id, workspaceId: workspace.id, role: "owner" });
  return { workspaceId: workspace.id, userId: user.id };
}

describe("dashboardService", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("returns zeros for empty workspace", async () => {
    const { workspaceId, userId } = await setupWorkspace();
    const data = await getDashboardData({ workspaceId, userId });
    expect(data.summary.totalEmployees).toBe(0);
    expect(data.summary.activePilots).toBe(0);
    expect(data.pilotsAtRisk.length).toBe(0);
  });

  it("aggregates pilots, meetings, reports", async () => {
    const { workspaceId, userId } = await setupWorkspace();
    const track = await createTrack(workspaceId, { name: "Команда A", levels: [{ name: "L1", description: "" }] });
    const employeeId = randomUUID();
    db.insert(employees)
      .values({
        id: employeeId,
        workspaceId,
        name: "Test Employee",
        position: "Engineer",
        level: "Middle",
        primaryTrackId: track?.id ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
    const pilotId = randomUUID();
    db.insert(pilotRuns)
      .values({
        id: pilotId,
        workspaceId,
        name: "Pilot 1",
        description: "desc",
        status: "active",
        ownerUserId: userId,
        targetCycleId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
    db.insert(pilotRunTeams)
      .values({
        id: randomUUID(),
        pilotRunId: pilotId,
        teamId: track?.id ?? randomUUID(),
      })
      .run();
    db.insert(pilotRunSteps)
      .values({
        id: randomUUID(),
        pilotRunId: pilotId,
        key: "define_scope",
        title: "Define",
        description: "desc",
        orderIndex: 0,
        status: "pending",
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        completedAt: null,
      })
      .run();
    db.insert(meetingAgendas)
      .values({
        id: randomUUID(),
        workspaceId,
        reportId: null,
        type: "team_review",
        title: "Meeting",
        description: null,
        scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 60,
        createdByUserId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
    db.insert(reports)
      .values({
        id: randomUUID(),
        workspaceId,
        type: "team",
        title: "Report",
        teamId: track?.id ?? null,
        pilotRunId: null,
        generatedFrom: "manual",
        status: "draft",
        createdByUserId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .run();

    const data = await getDashboardData({ workspaceId, userId });
    expect(data.summary.totalEmployees).toBe(1);
    expect(data.summary.activePilots).toBe(1);
    expect(data.pilotsAtRisk.length).toBe(1);
    expect(data.upcomingMeetings.length).toBe(1);
    expect(data.summary.staleReportsCount).toBeGreaterThan(0);
  });
});

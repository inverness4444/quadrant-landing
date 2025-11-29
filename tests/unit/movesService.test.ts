import { randomUUID } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { employees, employeeSkills } from "@/drizzle/schema";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createUser } from "@/repositories/userRepository";
import { createSkill } from "@/repositories/skillRepository";
import { createTrack } from "@/repositories/trackRepository";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import {
  addMoveScenarioAction,
  computeEmployeeRoleGap,
  computeTeamNeedsSummary,
  createJobRole,
  getMoveScenarioById,
  getWorkspaceJobRoles,
  saveMoveScenario,
  suggestMoveScenarioFromRisks,
  updateMoveScenarioStatus,
} from "@/services/movesService";

describe("moves service", () => {
  let workspaceId: string;
  let employeeId: string;
  let skillId: string;
  let userId: string;
  let trackId: string;

  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
    const plan = await ensureDefaultTestPlan();
    const user = await createUser({
      email: `moves+${randomUUID()}@example.com`,
      passwordHash: "hash",
      name: "Moves Owner",
    });
    userId = user.id;
    const workspace = await createWorkspace({
      name: "Moves Workspace",
      ownerUserId: user.id,
      size: "10-50",
      planId: plan?.id,
    });
    workspaceId = workspace.id;
    const track = await createTrack(workspaceId, { name: "Команда А", levels: [{ name: "L1", description: "" }] });
    trackId = track?.id ?? randomUUID();
    const skill = await createSkill(workspaceId, { name: "Golang", type: "hard" });
    skillId = skill.id;
    employeeId = randomUUID();
    db.insert(employees)
      .values({
        id: employeeId,
        workspaceId,
        name: "Engineer",
        position: "Backend",
        level: "Middle",
        primaryTrackId: trackId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
    db.insert(employeeSkills)
      .values({
        employeeId,
        skillId,
        level: 2,
      })
      .run();
  });

  it("creates and lists job roles", async () => {
    const role = await createJobRole({
      workspaceId,
      name: "Senior Backend",
      description: "Test role",
      levelBand: "Senior",
      isLeadership: false,
      requirements: [{ skillId, requiredLevel: 3, importance: "must_have" }],
    });
    expect(role.requirements.length).toBe(1);
    const roles = await getWorkspaceJobRoles(workspaceId);
    expect(roles.length).toBeGreaterThan(0);
  });

  it("computes gap for employee vs role", async () => {
    const role = await createJobRole({
      workspaceId,
      name: "Backend Lead",
      description: null,
      levelBand: "Senior",
      isLeadership: true,
      requirements: [{ skillId, requiredLevel: 3, importance: "must_have" }],
    });
    const gap = await computeEmployeeRoleGap({ employeeId, jobRoleId: role.id });
    expect(gap.aggregatedGapScore).toBeGreaterThan(0);
    expect(gap.skills[0]?.gap).toBe(1);
  });

  it("creates scenarios and actions", async () => {
    const scenario = await saveMoveScenario({
      workspaceId,
      createdByUserId: userId,
      title: "Scenario A",
      description: "Test scenario",
      actions: [],
    });
    expect(scenario.status).toBe("draft");
    await addMoveScenarioAction({
      scenarioId: scenario.id,
      workspaceId,
      action: { type: "hire", jobRoleId: null, teamId: null },
    });
    const updated = await getMoveScenarioById(scenario.id, workspaceId);
    expect(updated?.actions.length).toBeGreaterThan(0);
    const moved = await updateMoveScenarioStatus({ scenarioId: scenario.id, workspaceId, status: "review" });
    expect(moved?.status).toBe("review");
  });

  it("calculates team summary and detects hire requirement", async () => {
    const skillLeadership = await createSkill(workspaceId, { name: "Leadership", type: "soft" });
    await createJobRole({
      workspaceId,
      name: "Backend Lead",
      description: null,
      levelBand: "Senior",
      isLeadership: true,
      requirements: [
        { skillId, requiredLevel: 5, importance: "must_have" },
        { skillId: skillLeadership.id, requiredLevel: 7, importance: "must_have" },
      ],
    });
    await createJobRole({
      workspaceId,
      name: "Backend Dev",
      description: null,
      levelBand: "Middle",
      isLeadership: false,
      requirements: [{ skillId, requiredLevel: 2, importance: "must_have" }],
    });

    const summary = await computeTeamNeedsSummary({ teamId: trackId, workspaceId });
    expect(summary).not.toBeNull();
    const roles = summary!.roles;
    const hireRole = roles.find((role) => role.hireRequired);
    const developRole = roles.find((role) => !role.hireRequired);
    expect(hireRole?.hireRequired).toBe(true);
    expect(developRole?.internalCandidatesCount).toBeGreaterThan(0);
  });

  it("generates scenario from risks with hire and develop actions", async () => {
    const skillLeadership = await createSkill(workspaceId, { name: "Leadership", type: "soft" });
    const skillSupport = await createSkill(workspaceId, { name: "Ownership", type: "soft" });
    await createJobRole({
      workspaceId,
      name: "Team Lead",
      description: null,
      levelBand: "Senior",
      isLeadership: true,
      requirements: [
        { skillId, requiredLevel: 6, importance: "must_have" },
        { skillId: skillLeadership.id, requiredLevel: 7, importance: "must_have" },
      ],
    });
    await createJobRole({
      workspaceId,
      name: "Strong Backend",
      description: null,
      levelBand: "Middle",
      isLeadership: false,
      requirements: [
        { skillId, requiredLevel: 3, importance: "must_have" },
        { skillId: skillSupport.id, requiredLevel: 2, importance: "nice_to_have" },
      ],
    });

    const candidateId = randomUUID();
    db.insert(employees)
      .values({
        id: candidateId,
        workspaceId,
        name: "Второй инженер",
        position: "Backend",
        level: "Middle",
        primaryTrackId: trackId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
    db.insert(employeeSkills)
      .values({
        employeeId: candidateId,
        skillId,
        level: 3,
      })
      .run();

    const scenario = await suggestMoveScenarioFromRisks({
      workspaceId,
      createdByUserId: userId,
      teamId: trackId,
    });
    expect(scenario.actions.length).toBeGreaterThan(0);
    expect(scenario.actions.some((action) => action.type === "hire")).toBe(true);
    expect(scenario.actions.some((action) => action.type === "develop" || action.type === "promote")).toBe(true);
  });
});

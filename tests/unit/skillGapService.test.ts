import { randomUUID } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { employeeRoleAssignments, employeeSkillRatings, roleProfileSkillRequirements, employees } from "@/drizzle/schema";
import { createMember } from "@/repositories/memberRepository";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import {
  assignRoleToEmployee,
  getRoleProfilesForWorkspace,
  getSkillGapForEmployee,
  upsertEmployeeSkillRatings,
  upsertRoleProfile,
} from "@/services/skillGapService";

async function seedWorkspace() {
  await ensureDefaultTestPlan();
  const user = await createUser({ email: `skill-${randomUUID()}@example.com`, passwordHash: "hash", name: "Owner" });
  const workspace = await createWorkspace({ name: "Skill WS", ownerUserId: user.id, planId: null });
  await createMember({ userId: user.id, workspaceId: workspace.id, role: "owner" });
  const employeeId = randomUUID();
  db.insert(employees)
    .values({
      id: employeeId,
      workspaceId: workspace.id,
      name: "Emp",
      position: "Engineer",
      level: "Middle",
      primaryTrackId: null,
      trackLevelId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .run();
  return { workspace, user, employeeId };
}

describe("skillGapService", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("creates and updates role profile with requirements", async () => {
    const { workspace } = await seedWorkspace();
    const created = await upsertRoleProfile({
      workspaceId: workspace.id,
      name: "Backend",
      description: "Backend role",
      requirements: [
        { skillCode: "backend.go", levelRequired: 4, weight: 1.5 },
        { skillCode: "backend.arch", levelRequired: 3 },
      ],
    });
    expect(created.id).toBeTruthy();
    expect(created.requirements.length).toBe(2);

    const updated = await upsertRoleProfile({
      workspaceId: workspace.id,
      roleId: created.id,
      name: "Backend Senior",
      description: "Updated",
      isDefault: true,
      requirements: [{ skillCode: "backend.go", levelRequired: 5 }],
    });
    expect(updated.name).toBe("Backend Senior");
    expect(updated.requirements.length).toBe(1);
    const reqCount = await db.select().from(roleProfileSkillRequirements).where(eq(roleProfileSkillRequirements.roleProfileId, created.id));
    expect(reqCount.length).toBe(1);
  });

  it("assigns primary role and switches primary flag", async () => {
    const { workspace, employeeId } = await seedWorkspace();
    const roleA = await upsertRoleProfile({
      workspaceId: workspace.id,
      name: "Role A",
      requirements: [],
    });
    const roleB = await upsertRoleProfile({
      workspaceId: workspace.id,
      name: "Role B",
      requirements: [],
    });
    await assignRoleToEmployee({ workspaceId: workspace.id, employeeId, roleProfileId: roleA.id, isPrimary: true });
    await assignRoleToEmployee({ workspaceId: workspace.id, employeeId, roleProfileId: roleB.id, isPrimary: true });
    const assignments = await db
      .select()
      .from(employeeRoleAssignments)
      .where(and(eq(employeeRoleAssignments.workspaceId, workspace.id), eq(employeeRoleAssignments.employeeId, employeeId)));
    const primaryCount = assignments.filter((a) => a.isPrimary).length;
    expect(primaryCount).toBe(1);
    expect(assignments.find((a) => a.isPrimary)?.roleProfileId).toBe(roleB.id);
  });

  it("upserts employee skill ratings", async () => {
    const { workspace, employeeId } = await seedWorkspace();
    await upsertEmployeeSkillRatings({
      workspaceId: workspace.id,
      employeeId,
      source: "manager",
      ratings: [{ skillCode: "frontend.react", level: 3 }],
    });
    await upsertEmployeeSkillRatings({
      workspaceId: workspace.id,
      employeeId,
      source: "manager",
      ratings: [{ skillCode: "frontend.react", level: 4 }],
    });
    const rows = await db
      .select()
      .from(employeeSkillRatings)
      .where(and(eq(employeeSkillRatings.workspaceId, workspace.id), eq(employeeSkillRatings.employeeId, employeeId), eq(employeeSkillRatings.skillCode, "frontend.react")));
    expect(rows.length).toBe(1);
    expect(rows[0]?.level).toBe(4);
  });

  it("calculates skill gap for employee", async () => {
    const { workspace, employeeId } = await seedWorkspace();
    const role = await upsertRoleProfile({
      workspaceId: workspace.id,
      name: "Backend",
      requirements: [{ skillCode: "backend.go", levelRequired: 4, weight: 1 }],
    });
    await assignRoleToEmployee({ workspaceId: workspace.id, employeeId, roleProfileId: role.id, isPrimary: true });
    await upsertEmployeeSkillRatings({
      workspaceId: workspace.id,
      employeeId,
      source: "manager",
      ratings: [{ skillCode: "backend.go", level: 3 }],
    });
    const gap = await getSkillGapForEmployee({ workspaceId: workspace.id, employeeId });
    expect(gap.primaryRole?.id).toBe(role.id);
    const skill = gap.skills.find((s) => s.skillCode === "backend.go");
    expect(skill?.requiredLevel).toBe(4);
    expect(skill?.actualLevel).toBe(3);
    expect(skill?.gap).toBe(-1);
  });

  it("returns role profiles with requirements for workspace", async () => {
    const { workspace } = await seedWorkspace();
    await upsertRoleProfile({
      workspaceId: workspace.id,
      name: "QA",
      requirements: [{ skillCode: "qa.automation", levelRequired: 3 }],
    });
    const profiles = await getRoleProfilesForWorkspace(workspace.id);
    expect(profiles.length).toBeGreaterThan(0);
    expect(profiles[0]?.requirements.length).toBeGreaterThan(0);
  });
});

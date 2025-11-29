import { randomUUID } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { employees, type Employee } from "@/drizzle/schema";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { listSkills } from "@/repositories/skillRepository";
import { listEmployeeSkillsForEmployee } from "@/repositories/employeeRepository";
import { seedWorkspaceDemoData } from "@/services/workspaceSeed";
import { getWorkspaceSkillMap } from "@/services/skillMapService";
import { getWorkspaceRiskOverview, getEmployeeRiskProfile } from "@/services/riskService";
import { findPotentialReplacements, suggestGrowthPaths } from "@/services/mobilityService";
import { suggestTeamForProject } from "@/services/staffingService";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";

describe("analytics services", () => {
  let workspaceId: string;
  let referenceEmployee: Employee;

  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
    const plan = await ensureDefaultTestPlan();
    const user = await createUser({
      email: `tester+${randomUUID()}@example.com`,
      passwordHash: "hash",
      name: "Analytics Tester",
    });
    const workspace = await createWorkspace({
      name: "Analytics Demo",
      ownerUserId: user.id,
      size: "20-100",
      planId: plan?.id,
    });
    workspaceId = workspace.id;
    await seedWorkspaceDemoData(workspaceId);
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.workspaceId, workspaceId))
      .limit(1);
    if (!employee) {
      throw new Error("Failed to seed employees");
    }
    referenceEmployee = employee;
  });

  it("builds skill map with teams", async () => {
    const map = await getWorkspaceSkillMap(workspaceId);
    expect(map.totalEmployees).toBeGreaterThanOrEqual(10);
    expect(map.skills.length).toBeGreaterThan(5);
    expect(map.teams.length).toBeGreaterThan(1);
    const riskySkill = map.skills.find((skill) => skill.riskLevel !== "low");
    expect(riskySkill).toBeDefined();
  });

  it("reports workspace and employee risks", async () => {
    const risks = await getWorkspaceRiskOverview(workspaceId, 5);
    expect(risks.length).toBeGreaterThan(0);
    const profile = await getEmployeeRiskProfile(workspaceId, referenceEmployee.id);
    expect(profile).not.toBeNull();
    expect(profile?.criticalSkills).toBeDefined();
  });

  it("finds replacements and growth paths for employee", async () => {
    const replacements = await findPotentialReplacements(workspaceId, referenceEmployee.id, 3);
    expect(replacements.length).toBeGreaterThan(0);
    const growth = await suggestGrowthPaths(workspaceId, referenceEmployee.id, 3);
    expect(growth.length).toBeGreaterThan(0);
  });

  it("suggests staffing candidates for required skills", async () => {
    const employeeSkills = await listEmployeeSkillsForEmployee(referenceEmployee.id);
    const fallbackSkillList = await listSkills(workspaceId);
    const skillId = employeeSkills[0]?.skillId ?? fallbackSkillList[0]?.id;
    expect(skillId).toBeDefined();
    const result = await suggestTeamForProject(workspaceId, [{ skillId: skillId!, minLevel: 3 }]);
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates[0]?.matchingSkills).toBeDefined();
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});

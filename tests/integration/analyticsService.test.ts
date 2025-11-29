import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { artifacts, integrations, plans } from "@/drizzle/schema";
import {
  getEmployeesRiskList,
  getTopSkills,
  getWeakSkills,
  getWorkspaceOverview,
} from "@/services/analyticsService";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createMember } from "@/repositories/memberRepository";
import { createSkill } from "@/repositories/skillRepository";
import { createEmployee } from "@/repositories/employeeRepository";
import { createTrack } from "@/repositories/trackRepository";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";

beforeEach(async () => {
  await resetWorkspaceData({ includePlans: true });
});

async function seedWorkspaceWithPlan() {
  const planId = randomUUID();
  await db
    .insert(plans)
    .values({
      id: planId,
      code: "pro",
      name: "Pro",
      description: "Pro plan",
      maxMembers: 10,
      maxEmployees: 10,
      maxIntegrations: 2,
      maxArtifacts: null,
      isDefault: false,
      pricePerMonth: 200,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .run();

  const owner = await createUser({
    email: `owner-${planId}@example.com`,
    passwordHash: "hash",
    name: "Owner",
  });
  const workspace = await createWorkspace({
    name: "Analytics Workspace",
    ownerUserId: owner.id,
    planId,
  });
  await createMember({ userId: owner.id, workspaceId: workspace.id, role: "owner" });
  return workspace.id;
}

describe("analyticsService", () => {
  it("returns overview metrics with plan usage", async () => {
    const workspaceId = await seedWorkspaceWithPlan();
    const skill = await createSkill(workspaceId, { name: "React", type: "hard" });
    const employee = await createEmployee(workspaceId, {
      name: "Alice",
      position: "FE",
      level: "Junior",
      skills: [{ skillId: skill.id, level: 4 }],
    });
    await createTrack(workspaceId, {
      name: "Frontend",
      levels: [
        { name: "Junior", description: "" },
        { name: "Middle", description: "" },
      ],
    });
    await db
      .insert(integrations)
      .values({
        id: randomUUID(),
        workspaceId,
        type: "github",
        status: "connected",
        config: "{}",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
    await db
      .insert(artifacts)
      .values({
        id: randomUUID(),
        workspaceId,
        employeeId: employee?.id ?? randomUUID(),
        type: "code",
        title: "Demo",
        description: "Demo artifact",
        link: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();

    const overview = await getWorkspaceOverview(workspaceId);
    expect(overview.employeesCount).toBe(1);
    expect(overview.skillsCount).toBe(1);
    expect(overview.tracksCount).toBe(1);
    expect(overview.integrationsCount).toBe(1);
    expect(overview.plan.currentEmployeesCount).toBe(1);
    expect(overview.plan.currentIntegrationsCount).toBe(1);
  });

  it("returns top and weak skills ordered by average level", async () => {
    const workspaceId = await seedWorkspaceWithPlan();
    const react = await createSkill(workspaceId, { name: "React", type: "hard" });
    const qa = await createSkill(workspaceId, { name: "QA", type: "soft" });
    await createEmployee(workspaceId, {
      name: "Strong Dev",
      position: "FE",
      level: "Senior",
      skills: [
        { skillId: react.id, level: 5 },
        { skillId: qa.id, level: 2 },
      ],
    });
    await createEmployee(workspaceId, {
      name: "Junior QA",
      position: "QA",
      level: "Junior",
      skills: [{ skillId: qa.id, level: 2 }],
    });

    const top = await getTopSkills(workspaceId, 1);
    expect(top[0]?.name).toBe("React");
    expect(top[0]?.averageLevel).toBeGreaterThan(qa.id ? 2 : 0);

    const weak = await getWeakSkills(workspaceId, 2);
    expect(weak[0]?.name).toBe("QA");
    expect(weak[0]?.employeesWithSkillCount).toBeGreaterThanOrEqual(2);
  });

  it("highlights employees with low skill coverage", async () => {
    const workspaceId = await seedWorkspaceWithPlan();
    const react = await createSkill(workspaceId, { name: "React", type: "hard" });
    const leadership = await createSkill(workspaceId, { name: "Leadership", type: "soft" });
    await createEmployee(workspaceId, {
      name: "No Skills",
      position: "Intern",
      level: "Junior",
    });
    await createEmployee(workspaceId, {
      name: "Needs help",
      position: "Lead",
      level: "Senior",
      skills: [
        { skillId: react.id, level: 2 },
        { skillId: leadership.id, level: 2 },
      ],
    });

    const risk = await getEmployeesRiskList(workspaceId, 5);
    expect(risk.length).toBeGreaterThanOrEqual(2);
    const lowSkill = risk.find((entry) => entry.name === "Needs help");
    expect(lowSkill?.problems.some((p) => p.skillName === "React")).toBe(true);
    const noSkills = risk.find((entry) => entry.name === "No Skills");
    expect(noSkills?.problems[0]?.skillName).toMatch(/(Нет данных по навыкам|Недостаточно навыков)/);
  });
});

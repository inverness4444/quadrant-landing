import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  employeeSkills,
  employees,
  skills,
  tracks,
  trackLevels,
  users,
  workspaces,
} from "@/drizzle/schema";
import { createSkill, listSkills } from "@/repositories/skillRepository";
import {
  createEmployee,
  listEmployees,
  listEmployeeSkillsByWorkspace,
} from "@/repositories/employeeRepository";
import { createTrack, listTrackLevels } from "@/repositories/trackRepository";
import { getOverviewMetrics } from "@/services/dashboardService";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";

const workspaceName = "Test Workspace";

beforeEach(async () => {
  await db.delete(employeeSkills).run();
  await db.delete(employees).run();
  await db.delete(trackLevels).run();
  await db.delete(tracks).run();
  await db.delete(skills).run();
  await db.delete(workspaces).run();
  await db.delete(users).run();
});

async function createWorkspaceWithOwner() {
  const user = await createUser({
    email: `user-${Math.random()}@example.com`,
    passwordHash: "hash",
    name: "Tester",
  });
  const workspace = await createWorkspace({
    name: workspaceName,
    ownerUserId: user.id,
    size: "20-100",
  });
  return workspace.id;
}

describe("data layer", () => {
  it("creates employee with skills", async () => {
    const workspaceId = await createWorkspaceWithOwner();
    const skill = await createSkill(workspaceId, { name: "Golang", type: "hard" });
    await createEmployee(workspaceId, {
      name: "Demo",
      position: "Backend",
      level: "Middle",
      skills: [{ skillId: skill.id, level: 4 }],
    });
    const employeesList = await listEmployees(workspaceId);
    expect(employeesList).toHaveLength(1);
    const skillAssignments = await listEmployeeSkillsByWorkspace(workspaceId);
    expect(skillAssignments).toHaveLength(1);
    expect(skillAssignments[0]).toMatchObject({ skillId: skill.id, level: 4 });
  });

  it("creates track with ordered levels", async () => {
    const workspaceId = await createWorkspaceWithOwner();
    const track = await createTrack(workspaceId, {
      name: "Backend",
      levels: [
        { name: "Junior", description: "учится" },
        { name: "Senior", description: "руководит" },
      ],
    });
    const levels = await listTrackLevels(track.id);
    expect(levels.map((level) => level.name)).toEqual(["Junior", "Senior"]);
  });

  it("computes overview metrics", async () => {
    const workspaceId = await createWorkspaceWithOwner();
    const skill = await createSkill(workspaceId, { name: "React", type: "hard" });
    await createEmployee(workspaceId, {
      name: "Alice",
      position: "FE",
      level: "Junior",
      skills: [{ skillId: skill.id, level: 3 }],
    });
    const metrics = await getOverviewMetrics(workspaceId);
    expect(metrics.employees).toBe(1);
    expect(metrics.skills).toBe(1);
    expect(metrics.averageSkillLevel).toBe(3);
    expect(metrics.levelDistribution.find((item) => item.level === "Junior")?.count).toBe(1);
  });
});

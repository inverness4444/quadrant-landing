import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import {
  artifactSkills,
  artifacts,
  integrations,
  employees,
  employeeSkills,
  invites,
  members,
  skills,
  tracks,
  trackLevels,
  users,
  workspaces,
} from "@/drizzle/schema";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createMember } from "@/repositories/memberRepository";
import { createSkill } from "@/repositories/skillRepository";
import { createEmployee } from "@/repositories/employeeRepository";
import { GithubIntegrationClient } from "@/integrations/githubIntegration";
import { JiraIntegrationClient } from "@/integrations/jiraIntegration";
import { NotionIntegrationClient } from "@/integrations/notionIntegration";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";

beforeEach(async () => {
  await db.delete(artifactSkills).run();
  await db.delete(artifacts).run();
  await db.delete(integrations).run();
  await db.delete(employeeSkills).run();
  await db.delete(employees).run();
  await db.delete(invites).run();
  await db.delete(members).run();
  await db.delete(trackLevels).run();
  await db.delete(tracks).run();
  await db.delete(skills).run();
  await db.delete(workspaces).run();
  await db.delete(users).run();
  await ensureDefaultTestPlan();
});

async function seedWorkspaceWithData() {
  const user = await createUser({
    email: `seed-${randomUUID()}@example.com`,
    passwordHash: "hash",
    name: "Seeder",
  });
  const plan = await ensureDefaultTestPlan();
  const workspace = await createWorkspace({
    name: "Integration Workspace",
    ownerUserId: user.id,
    planId: plan?.id ?? null,
  });
  await createMember({
    userId: user.id,
    workspaceId: workspace.id,
    role: "owner",
  });
  const skill = await createSkill(workspace.id, { name: "TypeScript", type: "hard" });
  await createEmployee(workspace.id, {
    name: "Dev One",
    position: "Engineer",
    level: "Middle",
    skills: [{ skillId: skill.id, level: 4 }],
  });
  await createEmployee(workspace.id, {
    name: "Dev Two",
    position: "Engineer",
    level: "Senior",
    skills: [{ skillId: skill.id, level: 5 }],
  });
  return workspace.id;
}

describe("integration clients stubs", () => {
  it("github client produces demo artifacts", async () => {
    const workspaceId = await seedWorkspaceWithData();
    const client = new GithubIntegrationClient();
    const payloads = await client.syncDemoArtifacts({ workspaceId });
    expect(payloads.length).toBeGreaterThan(0);
    expect(payloads[0]?.assignees.length).toBeGreaterThan(0);
    expect(payloads[0]?.externalId).toBeTruthy();
  });

  it("jira client produces demo artifacts", async () => {
    const workspaceId = await seedWorkspaceWithData();
    const client = new JiraIntegrationClient();
    const payloads = await client.syncDemoArtifacts({ workspaceId });
    expect(payloads.length).toBeGreaterThan(0);
    expect(payloads[0]?.type).toBeDefined();
  });

  it("notion client produces demo artifacts", async () => {
    const workspaceId = await seedWorkspaceWithData();
    const client = new NotionIntegrationClient();
    const payloads = await client.syncDemoArtifacts({ workspaceId });
    expect(payloads.length).toBeGreaterThan(0);
    expect(payloads[0]?.summary).toBeTruthy();
  });
});

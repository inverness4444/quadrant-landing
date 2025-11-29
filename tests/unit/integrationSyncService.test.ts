import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import {
  artifacts,
  artifactSkills,
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
import { createArtifactsFromPayloads } from "@/services/integrationSyncService";
import { listArtifactsByWorkspace, listArtifactSkillsByWorkspace } from "@/repositories/artifactRepository";
import type { DemoArtifactPayload } from "@/integrations/baseIntegration";

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
});

async function setupWorkspace() {
  const user = await createUser({
    email: `sync-${randomUUID()}@example.com`,
    passwordHash: "hash",
    name: "Integrator",
  });
  const workspace = await createWorkspace({
    name: "Sync Workspace",
    ownerUserId: user.id,
  });
  await createMember({
    userId: user.id,
    workspaceId: workspace.id,
    role: "owner",
  });
  const skill = await createSkill(workspace.id, { name: "GoLang", type: "hard" });
  const employee = await createEmployee(workspace.id, {
    name: "Backend Dev",
    position: "Backend Engineer",
    level: "Senior",
    skills: [{ skillId: skill.id, level: 4 }],
  });
  return { workspaceId: workspace.id, employeeId: employee?.id ?? "", skillId: skill.id };
}

describe("integration sync service", () => {
  it("creates artifacts and artifact skills from payloads", async () => {
    const { workspaceId, employeeId, skillId } = await setupWorkspace();
    const payloads: DemoArtifactPayload[] = [
      {
        externalId: "PR-1",
        type: "pull_request",
        title: "PR: Demo",
        summary: "Добавление новой фичи",
        url: "https://github.com/example/pr/1",
        assignees: [{ employeeId, role: "author" }],
        skills: [{ skillId, confidence: 0.8 }],
      },
    ];
    const created = await createArtifactsFromPayloads(workspaceId, null, payloads);
    expect(created).toBe(1);
    const list = await listArtifactsByWorkspace(workspaceId);
    expect(list).toHaveLength(1);
    const skillLinks = await listArtifactSkillsByWorkspace(workspaceId);
    expect(skillLinks).toHaveLength(1);
    expect(skillLinks[0]?.confidence).toBeGreaterThan(0);
  });
});

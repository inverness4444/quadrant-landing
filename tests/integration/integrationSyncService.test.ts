import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createMember } from "@/repositories/memberRepository";
import { createSkill } from "@/repositories/skillRepository";
import { createEmployee } from "@/repositories/employeeRepository";
import { createArtifactsFromPayloads, runIntegrationSync } from "@/services/integrationSyncService";
import {
  listArtifactsByWorkspace,
  listArtifactSkillsByWorkspace,
} from "@/repositories/artifactRepository";
import { createIntegration, findIntegrationById } from "@/repositories/integrationRepository";
import type { DemoArtifactPayload } from "@/integrations/baseIntegration";
import { resetWorkspaceData } from "../utils/dbCleaner";

beforeEach(async () => {
  await resetWorkspaceData();
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
        employeeId,
        type: "code",
        title: "PR: Demo",
        description: "Добавление новой фичи",
        link: "https://github.com/example/pr/1",
        skills: [{ skillId, weight: 3 }],
      },
    ];
    const created = await createArtifactsFromPayloads(workspaceId, payloads);
    expect(created).toBe(1);
    const list = await listArtifactsByWorkspace(workspaceId);
    expect(list).toHaveLength(1);
    const skillLinks = await listArtifactSkillsByWorkspace(workspaceId);
    expect(skillLinks).toHaveLength(1);
    expect(skillLinks[0]?.weight).toBe(3);
  });

  it("runs registered integration client and updates last sync timestamp", async () => {
    const { workspaceId } = await setupWorkspace();
    const integration = await createIntegration({
      workspaceId,
      type: "github",
      status: "connected",
    });
    expect(integration).not.toBeNull();
    const before = await listArtifactsByWorkspace(workspaceId);
    const result = await runIntegrationSync(integration!);
    expect(result.createdArtifactsCount).toBeGreaterThan(0);
    const after = await listArtifactsByWorkspace(workspaceId);
    expect(after.length).toBeGreaterThan(before.length);
    const refreshed = await findIntegrationById(integration!.id);
    expect(refreshed?.lastSyncedAt).toBeTruthy();
  });
});

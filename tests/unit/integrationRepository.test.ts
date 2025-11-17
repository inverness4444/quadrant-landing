import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import {
  artifacts,
  artifactSkills,
  integrations,
  employeeSkills,
  employees,
  invites,
  members,
  skills,
  tracks,
  trackLevels,
  workspaces,
  users,
} from "@/drizzle/schema";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createMember } from "@/repositories/memberRepository";
import {
  createIntegration,
  listIntegrationsByWorkspace,
  findIntegrationByWorkspaceAndType,
  updateIntegration,
} from "@/repositories/integrationRepository";
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

async function createWorkspaceWithOwner() {
  const user = await createUser({
    email: `owner-${randomUUID()}@example.com`,
    passwordHash: "hash",
    name: "Owner",
  });
  const plan = await ensureDefaultTestPlan();
  const workspace = await createWorkspace({
    name: "Repo Test Workspace",
    ownerUserId: user.id,
    planId: plan?.id ?? null,
  });
  await createMember({
    userId: user.id,
    workspaceId: workspace.id,
    role: "owner",
  });
  return workspace.id;
}

describe("integrationRepository", () => {
  it("creates and lists integrations", async () => {
    const workspaceId = await createWorkspaceWithOwner();
    const integration = await createIntegration({
      workspaceId,
      type: "github",
      status: "connected",
    });
    expect(integration?.type).toBe("github");
    const list = await listIntegrationsByWorkspace(workspaceId);
    expect(list).toHaveLength(1);
    const found = await findIntegrationByWorkspaceAndType(workspaceId, "github");
    expect(found?.id).toBe(integration?.id);
  });

  it("updates integration status and lastSyncedAt", async () => {
    const workspaceId = await createWorkspaceWithOwner();
    const integration = await createIntegration({
      workspaceId,
      type: "jira",
      status: "connected",
    });
    expect(integration).toBeTruthy();
    const updated = await updateIntegration(integration!.id, {
      status: "error",
      lastSyncedAt: "2024-01-01T00:00:00.000Z",
    });
    expect(updated?.status).toBe("error");
    expect(updated?.lastSyncedAt).toBe("2024-01-01T00:00:00.000Z");
  });
});

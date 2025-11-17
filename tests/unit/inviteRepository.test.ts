import { randomUUID } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  invites,
  artifactSkills,
  artifacts,
  integrations,
  members,
  users,
  workspaces,
  employeeSkills,
  employees,
  skills,
  tracks,
  trackLevels,
} from "@/drizzle/schema";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createMember } from "@/repositories/memberRepository";
import {
  createInvite,
  findInviteByToken,
  listInvitesByWorkspace,
  markAccepted,
  markExpired,
} from "@/repositories/inviteRepository";
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

async function createWorkspaceContext() {
  const owner = await createUser({
    email: `owner-${randomUUID()}@example.com`,
    passwordHash: "hash",
    name: "Owner",
  });
  const plan = await ensureDefaultTestPlan();
  const workspace = await createWorkspace({
    name: "Test Workspace",
    ownerUserId: owner.id,
    planId: plan?.id ?? null,
  });
  await createMember({
    userId: owner.id,
    workspaceId: workspace.id,
    role: "owner",
  });
  return workspace.id;
}

describe("inviteRepository", () => {
  it("creates and lists invites", async () => {
    const workspaceId = await createWorkspaceContext();
    const invite = await createInvite({
      workspaceId,
      email: "Teammate@Example.com",
      role: "admin",
    });
    expect(invite.email).toBe("teammate@example.com");
    const list = await listInvitesByWorkspace(workspaceId);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(invite.id);
    const byToken = await findInviteByToken(invite.token);
    expect(byToken?.id).toBe(invite.id);
  });

  it("updates invite statuses", async () => {
    const workspaceId = await createWorkspaceContext();
    const invite = await createInvite({
      workspaceId,
      email: "user@example.com",
    });
    await markAccepted(invite.id);
    const accepted = await findInviteByToken(invite.token);
    expect(accepted?.status).toBe("accepted");
    await markExpired(invite.id);
    const expired = await findInviteByToken(invite.token);
    expect(expired?.status).toBe("expired");
  });
});

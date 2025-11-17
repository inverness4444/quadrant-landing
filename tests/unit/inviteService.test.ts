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
import { createMember, findMember } from "@/repositories/memberRepository";
import { createInvite, findInviteByToken } from "@/repositories/inviteRepository";
import { acceptInviteForUser, getInviteDetails } from "@/services/inviteService";
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
    name: "Workspace",
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

describe("inviteService", () => {
  it("returns invite details with workspace", async () => {
    const workspaceId = await createWorkspaceContext();
    const invite = await createInvite({
      workspaceId,
      email: "member@example.com",
    });
    const details = await getInviteDetails(invite.token);
    expect(details?.invite.id).toBe(invite.id);
    expect(details?.workspace.id).toBe(workspaceId);
  });

  it("accepts invite for matching email", async () => {
    const workspaceId = await createWorkspaceContext();
    const invite = await createInvite({
      workspaceId,
      email: "new.user@example.com",
      role: "admin",
    });
    const user = await createUser({
      email: "new.user@example.com",
      passwordHash: "hash",
      name: "New User",
    });
    const result = await acceptInviteForUser(invite, user);
    expect(result).toEqual({ status: "accepted", workspaceId });
    const membership = await findMember(workspaceId, user.id);
    expect(membership?.role).toBe("admin");
    const updatedInvite = await findInviteByToken(invite.token);
    expect(updatedInvite?.status).toBe("accepted");
  });

  it("rejects invite when email mismatches", async () => {
    const workspaceId = await createWorkspaceContext();
    const invite = await createInvite({
      workspaceId,
      email: "expected@example.com",
    });
    const user = await createUser({
      email: "other@example.com",
      passwordHash: "hash",
      name: "Other User",
    });
    const result = await acceptInviteForUser(invite, user);
    expect(result.status).toBe("email_mismatch");
  });

  it("marks invite as expired when past date", async () => {
    const workspaceId = await createWorkspaceContext();
    const invite = await createInvite({
      workspaceId,
      email: "expired@example.com",
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    const user = await createUser({
      email: "expired@example.com",
      passwordHash: "hash",
      name: "Late User",
    });
    const result = await acceptInviteForUser(invite, user);
    expect(result.status).toBe("expired");
    const updated = await findInviteByToken(invite.token);
    expect(updated?.status).toBe("expired");
  });
});

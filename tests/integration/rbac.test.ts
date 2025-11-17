import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createMember } from "@/repositories/memberRepository";
import { requireMember, requireRole, ensureOwnerChangeAllowed } from "@/services/rbac";
import { resetWorkspaceData } from "../utils/dbCleaner";

beforeEach(async () => {
  await resetWorkspaceData();
});

async function seedWorkspaceMembers() {
  const owner = await createUser({
    email: `owner-${randomUUID()}@example.com`,
    passwordHash: "hash",
    name: "Owner",
  });
  const workspace = await createWorkspace({
    name: `Workspace ${randomUUID()}`,
    ownerUserId: owner.id,
  });
  await createMember({
    userId: owner.id,
    workspaceId: workspace.id,
    role: "owner",
  });
  return { workspaceId: workspace.id, ownerId: owner.id };
}

describe("rbac helpers", () => {
  it("returns membership for existing user", async () => {
    const { workspaceId, ownerId } = await seedWorkspaceMembers();
    const member = await requireMember(workspaceId, ownerId);
    expect(member.role).toBe("owner");
  });

  it("throws when role requirement is not met", async () => {
    const { workspaceId } = await seedWorkspaceMembers();
    const memberUser = await createUser({
      email: `member-${randomUUID()}@example.com`,
      passwordHash: "hash",
      name: "Teammate",
    });
    await createMember({
      userId: memberUser.id,
      workspaceId,
      role: "member",
    });
    await expect(requireRole(workspaceId, memberUser.id, ["owner", "admin"])).rejects.toThrow(
      "ACCESS_DENIED",
    );
  });

  it("prevents removing last owner", async () => {
    const { workspaceId } = await seedWorkspaceMembers();
    await expect(ensureOwnerChangeAllowed(workspaceId, "admin")).rejects.toThrow(
      "CANNOT_REMOVE_LAST_OWNER",
    );
  });

  it("allows owner role change when multiple owners exist", async () => {
    const { workspaceId } = await seedWorkspaceMembers();
    const additionalOwner = await createUser({
      email: `co-owner-${randomUUID()}@example.com`,
      passwordHash: "hash",
      name: "Co Owner",
    });
    await createMember({
      userId: additionalOwner.id,
      workspaceId,
      role: "owner",
    });
    await expect(ensureOwnerChangeAllowed(workspaceId, "admin")).resolves.toBeUndefined();
  });
});

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { members, users, Member, User, MemberRole } from "@/drizzle/schema";
import { findWorkspaceByOwner } from "@/repositories/workspaceRepository";

const now = () => new Date().toISOString();

export type MemberWithUser = Member & { user: User };

export async function createMember({
  userId,
  workspaceId,
  role,
}: {
  userId: string;
  workspaceId: string;
  role: MemberRole;
}) {
  const timestamp = now();
  await db.insert(members).values({
    userId,
    workspaceId,
    role,
    createdAt: timestamp,
    updatedAt: timestamp,
  }).run();
  return {
    userId,
    workspaceId,
    role,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function findMember(workspaceId: string, userId: string) {
  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.workspaceId, workspaceId), eq(members.userId, userId)));
  return member ?? null;
}

export async function findMemberByUserId(userId: string) {
  const [member] = await db.select().from(members).where(eq(members.userId, userId));
  if (member) {
    return member;
  }
  const workspace = await findWorkspaceByOwner(userId);
  if (!workspace) {
    return null;
  }
  return createMember({
    userId,
    workspaceId: workspace.id,
    role: "owner",
  });
}

export async function listMembersByWorkspace(workspaceId: string) {
  const records = await db
    .select({
      member: members,
      user: users,
    })
    .from(members)
    .innerJoin(users, eq(users.id, members.userId))
    .where(eq(members.workspaceId, workspaceId))
    .orderBy(members.createdAt);
  return records.map(({ member, user }) => ({ ...member, user }));
}

export async function updateMemberRole(workspaceId: string, userId: string, role: MemberRole) {
  const [member] = await db
    .update(members)
    .set({
      role,
      updatedAt: now(),
    })
    .where(and(eq(members.workspaceId, workspaceId), eq(members.userId, userId)))
    .returning();
  return member ?? null;
}

export async function deleteMember(workspaceId: string, userId: string) {
  await db
    .delete(members)
    .where(and(eq(members.workspaceId, workspaceId), eq(members.userId, userId)))
    .run();
}

export async function countOwners(workspaceId: string) {
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(members)
    .where(and(eq(members.workspaceId, workspaceId), eq(members.role, "owner")));
  return Number(result.count ?? 0);
}

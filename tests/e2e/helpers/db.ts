import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { and, desc, eq } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";
import { db } from "../../../lib/db";
import {
  artifacts,
  employees,
  invites,
  members,
  plans,
  users,
  workspaces,
} from "../../../drizzle/schema";
import { createUser } from "../../../repositories/userRepository";
import { createWorkspace } from "../../../repositories/workspaceRepository";
import { createMember } from "../../../repositories/memberRepository";

export async function getWorkspaceSnapshotByOwnerEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    throw new Error(`User with email ${email} was not found`);
  }
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.ownerUserId, user.id));
  if (!workspace) {
    throw new Error(`Workspace for owner ${email} was not found`);
  }
  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.workspaceId, workspace.id), eq(members.userId, user.id)));
  const plan = workspace.planId
    ? (await db.select().from(plans).where(eq(plans.id, workspace.planId)).limit(1))[0] ?? null
    : null;
  return { user, workspace, member, plan };
}

export async function findMemberByEmail(workspaceId: string, email: string) {
  const [member] = await db
    .select({
      member: members,
    })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(and(eq(members.workspaceId, workspaceId), eq(users.email, email)))
    .limit(1);
  return member?.member ?? null;
}

export async function waitForInvite(workspaceId: string, email: string, attempts = 10) {
  for (let i = 0; i < attempts; i += 1) {
    const [invite] = await db
      .select()
      .from(invites)
      .where(and(eq(invites.workspaceId, workspaceId), eq(invites.email, email)))
      .orderBy(desc(invites.createdAt))
      .limit(1);
    if (invite) {
      return invite;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Invite for ${email} was not found`);
}

export async function ensureEmployeeCount(workspaceId: string, desiredCount: number) {
  if (desiredCount <= 0) return;
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(employees)
    .where(eq(employees.workspaceId, workspaceId));
  const current = Number(count ?? 0);
  const needed = desiredCount - current;
  if (needed <= 0) {
    return;
  }
  const timestamp = new Date().toISOString();
  for (let i = 0; i < needed; i += 1) {
    await db
      .insert(employees)
      .values({
        id: randomUUID(),
        workspaceId,
        name: `E2E Employee ${current + i + 1}`,
        position: "Engineer",
        level: "Middle",
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
  }
}

export async function getWorkspaceArtifactCount(workspaceId: string) {
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(artifacts)
    .where(eq(artifacts.workspaceId, workspaceId));
  return Number(count ?? 0);
}

export async function getDemoWorkspaceSnapshot() {
  const demoEmail = process.env.DEMO_EMAIL ?? "demo@quadrant.app";
  return getWorkspaceSnapshotByOwnerEmail(demoEmail);
}

export async function getInviteById(id: string) {
  const [invite] = await db.select().from(invites).where(eq(invites.id, id)).limit(1);
  return invite ?? null;
}

export async function waitForWorkspaceSnapshotByOwnerEmail(email: string, attempts = 10) {
  let lastError: Error | null = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await getWorkspaceSnapshotByOwnerEmail(email);
    } catch (error) {
      lastError = error as Error;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw lastError ?? new Error(`Workspace for ${email} was not found`);
}

export async function createWorkspaceOwnerAccount(email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createUser({
    email,
    passwordHash,
    name: "Playwright",
  });
  const workspace = await createWorkspace({
    name: `Playwright Workspace ${Date.now()}`,
    ownerUserId: user.id,
  });
  await createMember({
    userId: user.id,
    workspaceId: workspace.id,
    role: "owner",
  });
  return { user, workspace };
}

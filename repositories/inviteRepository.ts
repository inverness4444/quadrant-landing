import { desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { invites, Invite, MemberRole } from "@/drizzle/schema";

const now = () => new Date().toISOString();
const DEFAULT_EXPIRATION_MS = 1000 * 60 * 60 * 24 * 7;

type CreateInviteInput = {
  workspaceId: string;
  email: string;
  role?: MemberRole;
  expiresAt?: string;
};

export async function createInvite({ workspaceId, email, role = "member", expiresAt }: CreateInviteInput): Promise<Invite> {
  const id = randomUUID();
  const token = randomUUID();
  const timestamp = now();
  const expires = expiresAt ?? new Date(Date.now() + DEFAULT_EXPIRATION_MS).toISOString();
  const normalizedEmail = email.trim().toLowerCase();
  await db.insert(invites).values({
    id,
    workspaceId,
    email: normalizedEmail,
    role,
    token,
    status: "pending",
    expiresAt: expires,
    createdAt: timestamp,
    updatedAt: timestamp,
  }).run();
  return {
    id,
    workspaceId,
    email: normalizedEmail,
    role,
    token,
    status: "pending",
    expiresAt: expires,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function listInvitesByWorkspace(workspaceId: string): Promise<Invite[]> {
  return db
    .select()
    .from(invites)
    .where(eq(invites.workspaceId, workspaceId))
    .orderBy(desc(invites.createdAt));
}

export async function findInviteByToken(token: string): Promise<Invite | null> {
  const [invite] = await db.select().from(invites).where(eq(invites.token, token));
  return invite ?? null;
}

export async function findInviteById(inviteId: string): Promise<Invite | null> {
  const [invite] = await db.select().from(invites).where(eq(invites.id, inviteId));
  return invite ?? null;
}

export async function markAccepted(inviteId: string): Promise<Invite | null> {
  const [invite] = await db
    .update(invites)
    .set({ status: "accepted", updatedAt: now() })
    .where(eq(invites.id, inviteId))
    .returning();
  return invite ?? null;
}

export async function markExpired(inviteId: string): Promise<Invite | null> {
  const [invite] = await db
    .update(invites)
    .set({ status: "expired", updatedAt: now() })
    .where(eq(invites.id, inviteId))
    .returning();
  return invite ?? null;
}

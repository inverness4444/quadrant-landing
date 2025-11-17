import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, workspaces } from "@/drizzle/schema";

const now = () => new Date().toISOString();

export async function createUser({
  email,
  passwordHash,
  name,
}: {
  email: string;
  passwordHash: string;
  name?: string;
}) {
  const id = randomUUID();
  const timestamp = now();
  db.insert(users)
    .values({
      id,
      email,
      passwordHash,
      name,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();
  return {
    id,
    email,
    passwordHash,
    name,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user ?? null;
}

export async function findUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ?? null;
}

export async function updateUser(userId: string, data: { name?: string }) {
  const [user] = await db
    .update(users)
    .set({
      ...data,
      updatedAt: now(),
    })
    .where(eq(users.id, userId))
    .returning();
  return user ?? null;
}

export async function findUserWithWorkspace(userId: string) {
  const [result] = await db
    .select({
      user: users,
      workspace: workspaces,
    })
    .from(users)
    .leftJoin(workspaces, eq(workspaces.ownerUserId, users.id))
    .where(eq(users.id, userId));
  if (!result) return null;
  return {
    user: result.user,
    workspace: result.workspace ?? null,
  };
}

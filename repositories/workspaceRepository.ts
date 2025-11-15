import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaces } from "@/drizzle/schema";

const now = () => new Date().toISOString();

export async function createWorkspace({
  name,
  size,
  ownerUserId,
}: {
  name: string;
  size?: string | null;
  ownerUserId: string;
}) {
  const id = randomUUID();
  const timestamp = now();
  db.insert(workspaces)
    .values({
      id,
      name,
      size,
      ownerUserId,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();
  return {
    id,
    name,
    size,
    ownerUserId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function findWorkspaceById(id: string) {
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
  return workspace ?? null;
}

export async function findWorkspaceByOwner(ownerUserId: string) {
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.ownerUserId, ownerUserId));
  return workspace ?? null;
}

export async function updateWorkspace(workspaceId: string, data: { name?: string; size?: string | null }) {
  const [workspace] = await db
    .update(workspaces)
    .set({
      ...data,
      updatedAt: now(),
    })
    .where(eq(workspaces.id, workspaceId))
    .returning();
  return workspace ?? null;
}

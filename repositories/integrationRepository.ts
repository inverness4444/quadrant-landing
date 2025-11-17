import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { integrations, type Integration, type IntegrationStatus } from "@/drizzle/schema";

const now = () => new Date().toISOString();

export async function listIntegrationsByWorkspace(workspaceId: string) {
  return db.select().from(integrations).where(eq(integrations.workspaceId, workspaceId));
}

export async function findIntegrationByWorkspaceAndType(workspaceId: string, type: string) {
  const [integration] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.workspaceId, workspaceId), eq(integrations.type, type)));
  return integration ?? null;
}

export async function findIntegrationById(id: string) {
  const [integration] = await db.select().from(integrations).where(eq(integrations.id, id));
  return integration ?? null;
}

export async function createIntegration({
  workspaceId,
  type,
  config = {},
  status = "connected",
}: {
  workspaceId: string;
  type: string;
  config?: Record<string, unknown>;
  status?: IntegrationStatus;
}) {
  const id = randomUUID();
  const timestamp = now();
  db.insert(integrations)
    .values({
      id,
      workspaceId,
      type,
      status,
      config: JSON.stringify(config),
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();
  return findIntegrationById(id);
}

export async function updateIntegration(
  id: string,
  data: Partial<Pick<Integration, "status" | "config" | "lastSyncedAt">>,
) {
  const updates: Partial<Integration> = {
    updatedAt: now(),
  };
  if (typeof data.status !== "undefined") {
    updates.status = data.status;
  }
  if (typeof data.config !== "undefined") {
    updates.config = typeof data.config === "string" ? data.config : JSON.stringify(data.config);
  }
  if (typeof data.lastSyncedAt !== "undefined") {
    updates.lastSyncedAt = data.lastSyncedAt;
  }
  const [integration] = await db.update(integrations).set(updates).where(eq(integrations.id, id)).returning();
  return integration ?? null;
}

export async function deleteIntegration(id: string) {
  await db.delete(integrations).where(eq(integrations.id, id));
}

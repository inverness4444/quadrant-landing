import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans, workspaces } from "@/drizzle/schema";
import { ensureDefaultPlanSeeded, findDefaultPlan } from "@/repositories/planRepository";
import { env } from "@/config/env";

const now = () => new Date().toISOString();

export async function createWorkspace({
  name,
  size,
  ownerUserId,
  planId,
  trialEndsAt,
  billingEmail,
}: {
  name: string;
  size?: string | null;
  ownerUserId: string;
  planId?: string | null;
  trialEndsAt?: string | null;
  billingEmail?: string | null;
}) {
  const id = randomUUID();
  const timestamp = now();
  let resolvedPlanId = planId ?? null;
  if (!resolvedPlanId && !env.isTest) {
    await ensureDefaultPlanSeeded();
    const defaultPlan = await findDefaultPlan();
    if (defaultPlan) {
      resolvedPlanId = defaultPlan.id;
    } else {
      const fallbackPlanId = randomUUID();
      db.insert(plans)
        .values({
          id: fallbackPlanId,
          code: `auto_${fallbackPlanId}`,
          name: "Default",
          description: "Автоматически созданный план",
          isDefault: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .run();
      resolvedPlanId = fallbackPlanId;
    }
  }
  db.insert(workspaces)
    .values({
      id,
      name,
      size,
      ownerUserId,
      planId: resolvedPlanId,
      trialEndsAt: trialEndsAt ?? null,
      billingEmail: billingEmail ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();
  return {
    id,
    name,
    size,
    ownerUserId,
    planId: resolvedPlanId,
    trialEndsAt: trialEndsAt ?? null,
    billingEmail: billingEmail ?? null,
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

export async function updateWorkspace(
  workspaceId: string,
  data: { name?: string; size?: string | null; planId?: string | null; trialEndsAt?: string | null; billingEmail?: string | null },
) {
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

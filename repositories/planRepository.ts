import { randomUUID } from "crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans } from "@/drizzle/schema";

export async function listAllPlans() {
  return db.select().from(plans).orderBy(asc(plans.pricePerMonth), asc(plans.code));
}

export async function findPlanByCode(code: string) {
  const [plan] = await db.select().from(plans).where(eq(plans.code, code));
  return plan ?? null;
}

export async function findDefaultPlan() {
  const [plan] = await db.select().from(plans).where(eq(plans.isDefault, true)).limit(1);
  return plan ?? null;
}

export async function findPlanById(id: string) {
  const [plan] = await db.select().from(plans).where(eq(plans.id, id));
  return plan ?? null;
}

export async function ensureDefaultPlanSeeded() {
  const existingDefault = await findDefaultPlan();
  if (existingDefault) {
    return existingDefault;
  }
  const [freePlan] = await db.select().from(plans).where(eq(plans.code, "free")).limit(1);
  if (freePlan) {
    await db
      .update(plans)
      .set({
        isDefault: true,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(plans.id, freePlan.id))
      .run();
    return {
      ...freePlan,
      isDefault: true,
    };
  }
  const timestamp = new Date().toISOString();
  const planId = randomUUID();
  await db
    .insert(plans)
    .values({
      id: planId,
      code: "free",
      name: "Free",
      description: "Базовый тариф (auto)",
      maxMembers: 20,
      maxEmployees: 20,
      maxIntegrations: 1,
      maxArtifacts: null,
      isDefault: true,
      pricePerMonth: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();
  return findPlanById(planId);
}

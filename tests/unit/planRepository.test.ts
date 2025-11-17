import { randomUUID } from "crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { plans, workspaces } from "@/drizzle/schema";
import { listAllPlans, findPlanByCode, findDefaultPlan } from "@/repositories/planRepository";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";

beforeEach(async () => {
  await db.delete(workspaces).run();
  await db.delete(plans).run();
});

afterEach(async () => {
  await ensureDefaultTestPlan();
});

async function insertPlan({
  code,
  pricePerMonth,
  isDefault = false,
}: {
  code: string;
  pricePerMonth: number;
  isDefault?: boolean;
}) {
  const timestamp = new Date().toISOString();
  await db
    .insert(plans)
    .values({
      id: randomUUID(),
      code,
      name: code,
      description: `${code} plan`,
      maxMembers: 10,
      maxEmployees: 10,
      maxIntegrations: 1,
      maxArtifacts: null,
      isDefault,
      pricePerMonth,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();
}

describe("planRepository", () => {
  it("lists plans ordered by price", async () => {
    await insertPlan({ code: "scale", pricePerMonth: 500 });
    await insertPlan({ code: "free", pricePerMonth: 0, isDefault: true });
    await insertPlan({ code: "growth", pricePerMonth: 200 });
    const plansList = await listAllPlans();
    expect(plansList.map((plan) => plan.code)).toEqual(["free", "growth", "scale"]);
  });

  it("finds plan by code", async () => {
    await insertPlan({ code: "free", pricePerMonth: 0, isDefault: true });
    const plan = await findPlanByCode("free");
    expect(plan?.code).toBe("free");
  });

  it("finds default plan", async () => {
    await insertPlan({ code: "free", pricePerMonth: 0, isDefault: true });
    await insertPlan({ code: "growth", pricePerMonth: 200 });
    const plan = await findDefaultPlan();
    expect(plan?.code).toBe("free");
  });
});

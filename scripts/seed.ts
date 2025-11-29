import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { plans } from "../drizzle/schema";
import { findUserByEmail, createUser } from "../repositories/userRepository";
import { createWorkspace, updateWorkspace } from "../repositories/workspaceRepository";
import { createMember } from "../repositories/memberRepository";
import { createIntegration, findIntegrationByWorkspaceAndType } from "../repositories/integrationRepository";
import { findPlanByCode, findDefaultPlan } from "../repositories/planRepository";
import { seedWorkspaceDemoData } from "../services/workspaceSeed";
import { runIntegrationSync } from "../services/integrationSyncService";
import { seedProgramTemplates } from "../services/programSeed";
import { recomputeOnboardingState } from "../services/onboardingService";
import { invites } from "../drizzle/schema";
import { env } from "../config/env";

const planDefinitions = [
  {
    code: "free",
    name: "Free",
    description: "Базовый тариф для маленьких команд",
    maxMembers: 20,
    maxEmployees: 20,
    maxIntegrations: 1,
    isDefault: true,
    pricePerMonth: 0,
  },
  {
    code: "growth",
    name: "Growth",
    description: "Расширенный тариф для растущих компаний",
    maxMembers: 100,
    maxEmployees: 100,
    maxIntegrations: 3,
    isDefault: false,
    pricePerMonth: 200,
  },
  {
    code: "scale",
    name: "Scale",
    description: "Премиальный тариф для enterprise-команд",
    maxMembers: 500,
    maxEmployees: 500,
    maxIntegrations: 5,
    isDefault: false,
    pricePerMonth: 500,
  },
] as const;

async function runSeed() {
  await seedPlans();
  await seedProgramTemplates();
  const demoEmail = env.demo.email ?? "demo@quadrant.app";
  const demoPassword = env.demo.password ?? "demo12345";
  const existing = await findUserByEmail(demoEmail);
  if (existing) {
    console.log("Demo user already exists");
    process.exit(0);
  }
  const user = await createUser({
    email: demoEmail,
    passwordHash: await bcrypt.hash(demoPassword, 10),
    name: "Demo User",
  });
  const defaultPlan = await findDefaultPlan();
  const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const workspace = await createWorkspace({
    name: "Demo Company",
    size: "20-100",
    ownerUserId: user.id,
    planId: defaultPlan?.id,
    trialEndsAt,
    billingEmail: demoEmail,
  });
  const growthPlan = await findPlanByCode("growth");
  if (growthPlan) {
    await updateWorkspace(workspace.id, { planId: growthPlan.id });
  }
  await createMember({
    userId: user.id,
    workspaceId: workspace.id,
    role: "owner",
  });
  await seedWorkspaceDemoData(workspace.id);
  await seedDemoIntegrations(workspace.id);
  await seedDemoInvite(workspace.id);
  await recomputeOnboardingState(workspace.id);
  console.log(`Seed completed. Demo credentials: ${demoEmail} / ${demoPassword}`);
  process.exit(0);
}

async function seedPlans() {
  for (const definition of planDefinitions) {
    const existing = await findPlanByCode(definition.code);
    const payload = {
      code: definition.code,
      name: definition.name,
      description: definition.description,
      maxMembers: definition.maxMembers,
      maxEmployees: definition.maxEmployees,
      maxIntegrations: definition.maxIntegrations,
      maxArtifacts: null,
      isDefault: definition.isDefault,
      pricePerMonth: definition.pricePerMonth,
      updatedAt: new Date().toISOString(),
    };
    if (existing) {
      await db.update(plans).set(payload).where(eq(plans.id, existing.id)).run();
    } else {
      await db
        .insert(plans)
        .values({
          id: randomUUID(),
          ...payload,
          createdAt: new Date().toISOString(),
        })
        .run();
    }
  }
}

async function seedDemoIntegrations(workspaceId: string) {
  const github =
    (await findIntegrationByWorkspaceAndType(workspaceId, "github")) ??
    (await createIntegration({
      workspaceId,
      type: "github",
      name: "GitHub — core backend",
      config: { repo: "quadrant/backend" },
      status: "connected",
    }));
  if (github) {
    await runIntegrationSync(github);
  }
  const jira =
    (await findIntegrationByWorkspaceAndType(workspaceId, "jira")) ??
    (await createIntegration({
      workspaceId,
      type: "jira",
      name: "Jira — Team Quadrant",
      config: { project: "QDR" },
      status: "connected",
    }));
  if (jira) {
    await runIntegrationSync(jira);
  }
  const notion =
    (await findIntegrationByWorkspaceAndType(workspaceId, "notion")) ??
    (await createIntegration({
      workspaceId,
      type: "notion",
      name: "Notion — Product Wiki",
      config: { workspace: "Quadrant docs" },
      status: "connected",
    }));
  if (notion) {
    await runIntegrationSync(notion);
  }
}

async function seedDemoInvite(workspaceId: string) {
  const existingInvite = await db.query.invites.findFirst({
    where: eq(invites.workspaceId, workspaceId),
  });
  if (existingInvite) return;
  await db
    .insert(invites)
    .values({
      id: randomUUID(),
      workspaceId,
      email: "teammate-demo@quadrant.app",
      role: "member",
      token: randomUUID(),
      status: "pending",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .run();
}

runSeed().catch((error) => {
  console.error("Failed to seed database", error);
  process.exit(1);
});

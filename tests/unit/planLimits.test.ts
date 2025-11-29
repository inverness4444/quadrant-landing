import { randomUUID } from "crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  artifacts,
  artifactSkills,
  integrations,
  employees,
  employeeSkills,
  invites,
  members,
  plans,
  skills,
  trackLevels,
  tracks,
  users,
  workspaces,
} from "@/drizzle/schema";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { canAddEmployee, canAddIntegration, canAddMember } from "@/services/planLimits";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";

beforeEach(async () => {
  await db.delete(artifactSkills).run();
  await db.delete(artifacts).run();
  await db.delete(integrations).run();
  await db.delete(employeeSkills).run();
  await db.delete(employees).run();
  await db.delete(invites).run();
  await db.delete(members).run();
  await db.delete(trackLevels).run();
  await db.delete(tracks).run();
  await db.delete(skills).run();
  await db.delete(workspaces).run();
  await db.delete(plans).run();
  await db.delete(users).run();
});

afterEach(async () => {
  await ensureDefaultTestPlan();
});

async function createPlan({
  code,
  maxMembers,
  maxEmployees,
  maxIntegrations,
}: {
  code: string;
  maxMembers?: number | null;
  maxEmployees?: number | null;
  maxIntegrations?: number | null;
}) {
  const timestamp = new Date().toISOString();
  const id = randomUUID();
  await db
    .insert(plans)
    .values({
      id,
      code,
      name: code,
      description: `${code} plan`,
      maxMembers: maxMembers ?? null,
      maxEmployees: maxEmployees ?? null,
      maxIntegrations: maxIntegrations ?? null,
      maxArtifacts: null,
      isDefault: false,
      pricePerMonth: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();
  return id;
}

async function createWorkspaceWithPlan(planId: string) {
  const user = await createUser({
    email: `plan-${planId}@example.com`,
    passwordHash: "hash",
    name: "Planner",
  });
  const workspace = await createWorkspace({
    name: "Workspace",
    ownerUserId: user.id,
    planId,
    billingEmail: user.email,
  });
  const timestamp = new Date().toISOString();
  await db
    .insert(members)
    .values({
      userId: user.id,
      workspaceId: workspace.id,
      role: "owner",
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();
  return workspace.id;
}

describe("planLimits service", () => {
  it("allows adding employees when under limit", async () => {
    const planId = await createPlan({ code: "limited", maxEmployees: 2 });
    const workspaceId = await createWorkspaceWithPlan(planId);
    const result = await canAddEmployee(workspaceId);
    expect(result.allowed).toBe(true);
  });

  it("blocks adding employees when limit reached", async () => {
    const planId = await createPlan({ code: "limited", maxEmployees: 1 });
    const workspaceId = await createWorkspaceWithPlan(planId);
    await db
      .insert(employees)
      .values({
        id: randomUUID(),
        workspaceId,
        name: "Dev",
        position: "Engineer",
        level: "Middle",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
    const result = await canAddEmployee(workspaceId);
    expect(result.allowed).toBe(false);
  });

  it("treats zero or null max as unlimited for integrations", async () => {
    const planId = await createPlan({ code: "unlimited", maxIntegrations: null });
    const workspaceId = await createWorkspaceWithPlan(planId);
    const result = await canAddIntegration(workspaceId);
    expect(result.allowed).toBe(true);
  });

  it("blocks adding members when limit reached", async () => {
    const planId = await createPlan({ code: "members", maxMembers: 1 });
    const workspaceId = await createWorkspaceWithPlan(planId);
    const extraUser = await createUser({
      email: `member-${workspaceId}@example.com`,
      passwordHash: "hash",
      name: "Member",
    });
    await db
      .insert(members)
      .values({
        userId: extraUser.id,
        workspaceId,
        role: "member",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
    const check = await canAddMember(workspaceId);
    expect(check.allowed).toBe(false);
  });
});

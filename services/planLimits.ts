import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";
import { db } from "@/lib/db";
import {
  artifacts,
  employees,
  integrations,
  members,
  type Plan,
  type Workspace,
} from "@/drizzle/schema";
import { findPlanById } from "@/repositories/planRepository";
import { findWorkspaceById } from "@/repositories/workspaceRepository";
import { trackEvent } from "@/services/monitoring";

export type WorkspaceUsage = {
  currentMembersCount: number;
  currentEmployeesCount: number;
  currentIntegrationsCount: number;
  currentArtifactsCount: number;
};

export type LimitCheckResult = {
  allowed: boolean;
  reason?: string;
};

type PlanWithWorkspace = {
  workspace: Workspace;
  plan: Plan;
};

export async function getWorkspacePlan(workspaceId: string): Promise<PlanWithWorkspace> {
  const workspace = await findWorkspaceById(workspaceId);
  if (!workspace || !workspace.planId) {
    throw new Error("PLAN_NOT_CONFIGURED");
  }
  const plan = await findPlanById(workspace.planId);
  if (!plan) {
    throw new Error("PLAN_NOT_FOUND");
  }
  return { workspace, plan };
}

export async function getWorkspaceUsage(workspaceId: string): Promise<WorkspaceUsage> {
  const [membersResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(members)
    .where(eq(members.workspaceId, workspaceId));
  const [employeesResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(employees)
    .where(eq(employees.workspaceId, workspaceId));
  const [integrationsResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(integrations)
    .where(and(eq(integrations.workspaceId, workspaceId), eq(integrations.status, "connected")));
  const [artifactsResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(artifacts)
    .where(eq(artifacts.workspaceId, workspaceId));

  return {
    currentMembersCount: Number(membersResult?.count ?? 0),
    currentEmployeesCount: Number(employeesResult?.count ?? 0),
    currentIntegrationsCount: Number(integrationsResult?.count ?? 0),
    currentArtifactsCount: Number(artifactsResult?.count ?? 0),
  };
}

function checkLimit(
  workspaceId: string,
  current: number,
  max: number | null | undefined,
  resourceTitle: string,
  planName: string,
): LimitCheckResult {
  if (!max || max <= 0) {
    return { allowed: true };
  }
  if (current < max) {
    return { allowed: true };
  }
  trackEvent("plan_limit_hit", { workspaceId, resource: resourceTitle, plan: planName });
  return {
    allowed: false,
    reason: `Вы достигли лимита по ресурсу «${resourceTitle}» на плане ${planName}. Обновите тариф или свяжитесь с нами.`,
  };
}

async function getPlanAndUsage(workspaceId: string) {
  const [{ workspace, plan }, usage] = await Promise.all([getWorkspacePlan(workspaceId), getWorkspaceUsage(workspaceId)]);
  return { workspace, plan, usage };
}

export async function canAddEmployee(workspaceId: string): Promise<LimitCheckResult> {
  const { plan, usage } = await getPlanAndUsage(workspaceId);
  return checkLimit(workspaceId, usage.currentEmployeesCount, plan.maxEmployees, "Сотрудники", plan.name);
}

export async function canAddMember(workspaceId: string): Promise<LimitCheckResult> {
  const { plan, usage } = await getPlanAndUsage(workspaceId);
  return checkLimit(workspaceId, usage.currentMembersCount, plan.maxMembers, "Участники", plan.name);
}

export async function canAddIntegration(workspaceId: string): Promise<LimitCheckResult> {
  const { plan, usage } = await getPlanAndUsage(workspaceId);
  return checkLimit(workspaceId, usage.currentIntegrationsCount, plan.maxIntegrations, "Интеграции", plan.name);
}

import { randomUUID } from "crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { employees, riskCases, type RiskLevel, type RiskStatus } from "@/drizzle/schema";
import { createNotification } from "@/services/notificationService";
import { findWorkspaceById } from "@/repositories/workspaceRepository";
import { logger } from "@/services/logger";
import type { RiskCaseSummary, RiskListResult } from "@/services/types/riskCenter";

const OPEN_STATUSES: RiskStatus[] = ["open", "monitoring"];
const levelRank: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3 };

function isMissingRiskCaseTable(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /risk_cases/i.test(error.message ?? "") || error.message === "RISK_CASES_NOT_AVAILABLE";
}

async function resolveOwnerUserId(workspaceId: string, provided?: string | null) {
  if (provided) return provided;
  const workspace = await findWorkspaceById(workspaceId);
  return workspace?.ownerUserId ?? null;
}

async function safeNotify(input: {
  workspaceId: string;
  userId: string;
  type: "risk_employee" | "risk_case_resolved";
  title: string;
  body: string;
  url?: string;
}) {
  try {
    await createNotification({
      workspaceId: input.workspaceId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      url: input.url,
    });
  } catch (error) {
    logger.warn("risk_case_notification_failed", {
      workspaceId: input.workspaceId,
      userId: input.userId,
      type: input.type,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function notifyHighRiskCase(riskCase: RiskCaseSummary) {
  if (riskCase.level !== "high") return;
  const recipient = riskCase.ownerUserId ?? (await resolveOwnerUserId(riskCase.workspaceId));
  if (!recipient) return;
  await safeNotify({
    workspaceId: riskCase.workspaceId,
    userId: recipient,
    type: "risk_employee",
    title: `High-risk: ${riskCase.employeeName}`,
    body: riskCase.title,
    url: `/app/risk-center?caseId=${riskCase.id}`,
  });
}

async function notifyResolvedCase(riskCase: RiskCaseSummary) {
  if (riskCase.status !== "resolved") return;
  const recipient = riskCase.ownerUserId ?? (await resolveOwnerUserId(riskCase.workspaceId));
  if (!recipient) return;
  await safeNotify({
    workspaceId: riskCase.workspaceId,
    userId: recipient,
    type: "risk_case_resolved",
    title: `Кейс закрыт: ${riskCase.title}`,
    body: riskCase.reason ?? "Кейс помечен как resolved",
    url: `/app/risk-center?caseId=${riskCase.id}`,
  });
}

function mapCaseRow(row: {
  case: typeof riskCases.$inferSelect;
  employeeName: string | null;
  employeeRole: string | null;
}): RiskCaseSummary {
  return {
    id: row.case.id,
    workspaceId: row.case.workspaceId,
    employeeId: row.case.employeeId,
    employeeName: row.employeeName ?? "Сотрудник",
    employeeRole: row.employeeRole,
    level: row.case.level as RiskLevel,
    status: row.case.status as RiskStatus,
    source: row.case.source,
    title: row.case.title,
    reason: row.case.reason ?? null,
    recommendation: row.case.recommendation ?? null,
    pilotId: row.case.pilotId ?? null,
    ownerUserId: row.case.ownerUserId ?? null,
    detectedAt: new Date(row.case.detectedAt),
    updatedAt: new Date(row.case.updatedAt),
  };
}

async function getCaseById(workspaceId: string, caseId: string): Promise<RiskCaseSummary> {
  try {
    const [row] = await db
      .select({
        case: riskCases,
        employeeName: employees.name,
        employeeRole: employees.position,
      })
      .from(riskCases)
      .leftJoin(employees, eq(riskCases.employeeId, employees.id))
      .where(and(eq(riskCases.workspaceId, workspaceId), eq(riskCases.id, caseId)))
      .limit(1);
    if (!row) {
      throw new Error("RISK_CASE_NOT_FOUND");
    }
    return mapCaseRow(row);
  } catch (error) {
    if (isMissingRiskCaseTable(error)) {
      throw new Error("RISK_CASES_NOT_AVAILABLE");
    }
    throw error;
  }
}

export async function getRiskCaseById(workspaceId: string, caseId: string): Promise<RiskCaseSummary> {
  return getCaseById(workspaceId, caseId);
}

async function findActiveCase(
  workspaceId: string,
  employeeId: string,
  level?: RiskLevel,
): Promise<RiskCaseSummary | null> {
  try {
    const filters = [
      eq(riskCases.workspaceId, workspaceId),
      eq(riskCases.employeeId, employeeId),
      inArray(riskCases.status, OPEN_STATUSES),
    ];
    if (level) {
      filters.push(eq(riskCases.level, level));
    }
    const [row] = await db
      .select({
        case: riskCases,
        employeeName: employees.name,
        employeeRole: employees.position,
      })
      .from(riskCases)
      .leftJoin(employees, eq(riskCases.employeeId, employees.id))
      .where(and(...filters))
      .orderBy(desc(riskCases.detectedAt))
      .limit(1);
    return row ? mapCaseRow(row) : null;
  } catch (error) {
    if (isMissingRiskCaseTable(error)) {
      return null;
    }
    throw error;
  }
}

export async function listRiskCases(input: {
  workspaceId: string;
  statuses?: RiskStatus[];
  levels?: RiskLevel[];
  search?: string;
  limit?: number;
  offset?: number;
  ownerUserId?: string;
}): Promise<RiskListResult> {
  try {
    const statuses = input.statuses && input.statuses.length > 0 ? input.statuses : OPEN_STATUSES;
    const filters = [eq(riskCases.workspaceId, input.workspaceId)];
    if (statuses.length > 0) {
      filters.push(inArray(riskCases.status, statuses));
    }
    if (input.levels?.length) {
      filters.push(inArray(riskCases.level, input.levels));
    }
    if (input.ownerUserId) {
      filters.push(eq(riskCases.ownerUserId, input.ownerUserId));
    }
    if (input.search) {
      const term = `%${input.search.toLowerCase()}%`;
      filters.push(
        sql`(lower(${employees.name}) like ${term} or lower(${riskCases.title}) like ${term} or lower(${riskCases.reason}) like ${term})`,
      );
    }
    const where = and(...filters);
    const limit = Math.min(100, Math.max(0, input.limit ?? 50));
    const offset = Math.max(0, input.offset ?? 0);
    const rows = await db
      .select({
        case: riskCases,
        employeeName: employees.name,
        employeeRole: employees.position,
      })
      .from(riskCases)
      .leftJoin(employees, eq(riskCases.employeeId, employees.id))
      .where(where)
      .orderBy(desc(riskCases.detectedAt))
      .limit(limit)
      .offset(offset);

    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(riskCases)
      .leftJoin(employees, eq(riskCases.employeeId, employees.id))
      .where(where);

    const [openCountRow, highCountRow] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(riskCases)
        .where(and(eq(riskCases.workspaceId, input.workspaceId), inArray(riskCases.status, OPEN_STATUSES))),
      db
        .select({ count: sql<number>`count(*)` })
        .from(riskCases)
        .where(
          and(
            eq(riskCases.workspaceId, input.workspaceId),
            inArray(riskCases.status, OPEN_STATUSES),
            eq(riskCases.level, "high"),
          ),
        ),
    ]);

    return {
      items: rows.map(mapCaseRow),
      total: Number(total ?? rows.length),
      openCount: Number(openCountRow[0]?.count ?? 0),
      highCount: Number(highCountRow[0]?.count ?? 0),
    };
  } catch (error) {
    if (isMissingRiskCaseTable(error)) {
      return { items: [], total: 0, openCount: 0, highCount: 0 };
    }
    throw error;
  }
}

export async function createRiskCase(input: {
  workspaceId: string;
  employeeId: string;
  level: RiskLevel;
  source: string;
  title: string;
  reason?: string;
  recommendation?: string;
  ownerUserId?: string;
  createdByUserId?: string;
}): Promise<RiskCaseSummary> {
  try {
    const employee = await db.query.employees.findFirst({ where: (fields, { eq }) => eq(fields.id, input.employeeId) });
    if (!employee || employee.workspaceId !== input.workspaceId) {
      throw new Error("EMPLOYEE_NOT_FOUND");
    }
    const resolvedOwnerId = await resolveOwnerUserId(input.workspaceId, input.ownerUserId);
    const now = new Date().toISOString();
    const id = randomUUID();
    db.insert(riskCases)
      .values({
        id,
        workspaceId: input.workspaceId,
        employeeId: input.employeeId,
        detectedAt: now,
        level: input.level,
        source: input.source,
        status: "open",
        title: input.title,
        reason: input.reason ?? null,
        recommendation: input.recommendation ?? null,
        pilotId: null,
        createdByUserId: input.createdByUserId ?? null,
        ownerUserId: resolvedOwnerId,
        resolvedAt: null,
        resolutionNote: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const riskCase = await getCaseById(input.workspaceId, id);
    await notifyHighRiskCase(riskCase);
    return riskCase;
  } catch (error) {
    if (isMissingRiskCaseTable(error)) {
      throw new Error("RISK_CASES_NOT_AVAILABLE");
    }
    throw error;
  }
}

export async function ensureRiskCase(input: {
  workspaceId: string;
  employeeId: string;
  level: RiskLevel;
  source: string;
  title: string;
  reason?: string;
  recommendation?: string;
  ownerUserId?: string;
  createdByUserId?: string;
}): Promise<RiskCaseSummary> {
  const existingSameLevel = await findActiveCase(input.workspaceId, input.employeeId, input.level);
  if (existingSameLevel) {
    return existingSameLevel;
  }
  const existingAny = await findActiveCase(input.workspaceId, input.employeeId);
  if (existingAny && levelRank[input.level] <= levelRank[existingAny.level as RiskLevel]) {
    return existingAny;
  }
  if (existingAny && levelRank[input.level] > levelRank[existingAny.level as RiskLevel]) {
    db.update(riskCases)
      .set({
        level: input.level,
        reason: input.reason ?? existingAny.reason ?? null,
        recommendation: input.recommendation ?? existingAny.recommendation ?? null,
        source: input.source,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(riskCases.id, existingAny.id))
      .run();
    const upgraded = await getCaseById(input.workspaceId, existingAny.id);
    await notifyHighRiskCase(upgraded);
    return upgraded;
  }
  return createRiskCase(input);
}

export async function updateRiskCaseStatus(input: {
  workspaceId: string;
  caseId: string;
  status: RiskStatus;
  resolutionNote?: string;
  resolvedByUserId?: string;
}): Promise<RiskCaseSummary> {
  try {
    const existing = await db.query.riskCases.findFirst({
      where: (fields, { eq }) => eq(fields.id, input.caseId),
    });
    if (!existing || existing.workspaceId !== input.workspaceId) {
      throw new Error("RISK_CASE_NOT_FOUND");
    }
    const now = new Date().toISOString();
    const updatePayload: Partial<typeof riskCases.$inferInsert> = {
      status: input.status,
      updatedAt: now,
    };
    if (input.status === "resolved") {
      updatePayload.resolvedAt = now;
      updatePayload.resolutionNote = input.resolutionNote ?? existing.resolutionNote ?? null;
    } else {
      updatePayload.resolvedAt = null;
      if (input.resolutionNote !== undefined) {
        updatePayload.resolutionNote = input.resolutionNote;
      }
    }
    db.update(riskCases).set(updatePayload).where(eq(riskCases.id, input.caseId)).run();
    const updated = await getCaseById(input.workspaceId, input.caseId);
    await notifyResolvedCase(updated);
    return updated;
  } catch (error) {
    if (isMissingRiskCaseTable(error)) {
      throw new Error("RISK_CASES_NOT_AVAILABLE");
    }
    throw error;
  }
}

export async function attachPilotToRiskCase(input: {
  workspaceId: string;
  caseId: string;
  pilotId: string;
}): Promise<RiskCaseSummary> {
  try {
    const [existingCase, pilot] = await Promise.all([
      db.query.riskCases.findFirst({
        where: (fields, { eq }) => eq(fields.id, input.caseId),
      }),
      db.query.pilotRuns.findFirst({
        where: (fields, { eq }) => eq(fields.id, input.pilotId),
      }),
    ]);
    if (!existingCase || existingCase.workspaceId !== input.workspaceId) {
      throw new Error("RISK_CASE_NOT_FOUND");
    }
    if (!pilot || pilot.workspaceId !== input.workspaceId) {
      throw new Error("PILOT_NOT_FOUND");
    }
    db.update(riskCases)
      .set({ pilotId: input.pilotId, updatedAt: new Date().toISOString() })
      .where(eq(riskCases.id, input.caseId))
      .run();
    return getCaseById(input.workspaceId, input.caseId);
  } catch (error) {
    if (isMissingRiskCaseTable(error)) {
      throw new Error("RISK_CASES_NOT_AVAILABLE");
    }
    throw error;
  }
}

export async function getRiskCasesForEmployee(input: {
  workspaceId: string;
  employeeId: string;
  onlyOpen?: boolean;
}): Promise<RiskCaseSummary[]> {
  try {
    const filters = [eq(riskCases.workspaceId, input.workspaceId), eq(riskCases.employeeId, input.employeeId)];
    if (input.onlyOpen) {
      filters.push(inArray(riskCases.status, OPEN_STATUSES));
    }
    const rows = await db
      .select({
        case: riskCases,
        employeeName: employees.name,
        employeeRole: employees.position,
      })
      .from(riskCases)
      .leftJoin(employees, eq(riskCases.employeeId, employees.id))
      .where(and(...filters))
      .orderBy(desc(riskCases.detectedAt));
    return rows.map(mapCaseRow);
  } catch (error) {
    if (isMissingRiskCaseTable(error)) {
      return [];
    }
    throw error;
  }
}

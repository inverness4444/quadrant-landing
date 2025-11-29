import { randomUUID } from "crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  employees,
  feedbackAnswers,
  feedbackResponses,
  feedbackSurveys,
  employeeRoleAssignments,
  employeeSkillRatings,
  roleProfiles,
  skills,
  pilotRuns,
  pilotRunTeams,
  pilotRunParticipants,
  quarterlyReports,
  talentDecisions,
  tracks,
  pilotTemplates,
  type QuarterlyReport,
  type TalentDecision,
  type QuarterlyReportPayload,
  developmentGoals,
  developmentGoalCheckins,
} from "@/drizzle/schema";
import { ensureRiskCase } from "@/services/riskCenterService";
import { logger } from "@/services/logger";

export type QuarterlyPeriod = { year: number; quarter: 1 | 2 | 3 | 4; label: string };

export type QuarterlyMetricSummary = {
  period: QuarterlyPeriod;
  pilotsTotal: number;
  pilotsCompleted: number;
  pilotsInProgress: number;
  employeesTouched: number;
  employeesAtRisk: number;
  promotionsCount: number;
  lateralMovesCount: number;
  decisionsTotal: number;
  decisionsProposed: number;
  decisionsApproved: number;
  decisionsImplemented: number;
  decisionsRejected: number;
  criticalSkillGaps: number;
  skillsImprovedCount?: number | null;
};

export type QuarterlyReportDTO = {
  id: string | null;
  workspaceId: string;
  period: QuarterlyPeriod;
  title: string;
  notes: string | null;
  isLocked: boolean;
  metrics: QuarterlyMetricSummary;
  topRisks: Array<{ employeeId: string; employeeName: string; teamName?: string | null; reason: string }>;
  topWins: Array<{ employeeId?: string; label: string; description: string }>;
  recommendedNextSteps: string[];
};

export type QuarterlyReportSummary = {
  workspaceId: string;
  year: number;
  quarter: number;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  source: "from_cache" | "from_live_data";
  metrics: {
    employeesTotal: number;
    employeesAtRisk: number;
    employeesReadyForPromo: number;
    newHires: number;
    leavers: number;
    pilotsCount: number;
    pilotsFromTemplates?: number;
    pilotsManual?: number;
    decisionsCount: number;
  };
  topRisks: Array<{ employeeId: string; employeeName: string; role: string | null; riskReasons: string[] }>;
  topWins: Array<{ employeeId: string | null; employeeName: string | null; role: string | null; winReasons: string[] }>;
  topTemplates?: Array<{ templateId: string; title: string; used: number }>;
  employees: Array<{
    id: string;
    name: string;
    role: string | null;
    level: string | null;
    status: string | null;
    isAtRisk: boolean;
    isReadyForPromo: boolean;
    artifactsCount: number;
    pilotsInvolved: number;
    lastDecisionAt: string | null;
    summary: string;
  }>;
  summaryParagraph: string;
  summaryForHR?: string;
  summaryForCTO?: string;
};

export function deriveQuarter(date = new Date()): QuarterlyPeriod {
  const month = date.getUTCMonth();
  const quarter = (Math.floor(month / 3) + 1) as 1 | 2 | 3 | 4;
  const year = date.getUTCFullYear();
  return { year, quarter, label: `Q${quarter} ${year}` };
}

export function parseQuarterlyReportPayload(raw: unknown): QuarterlyReportPayload | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as QuarterlyReportPayload;
    } catch {
      return null;
    }
  }
  return raw as QuarterlyReportPayload;
}

export function getQuarterDateRange(year: number, quarter: 1 | 2 | 3 | 4) {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59, 999));
  return { start, end };
}

export async function generateQuarterlyPayload(input: { workspaceId: string; year: number; quarter: 1 | 2 | 3 | 4 }): Promise<QuarterlyReportPayload> {
  const { start, end } = getQuarterDateRange(input.year, input.quarter);
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const employeeRows = await db.select().from(employees).where(eq(employees.workspaceId, input.workspaceId));
  const roleRows = await db.select().from(roleProfiles).where(eq(roleProfiles.workspaceId, input.workspaceId));
  const assignments = await db
    .select({
      employeeId: employeeRoleAssignments.employeeId,
      roleId: employeeRoleAssignments.roleProfileId,
      isPrimary: employeeRoleAssignments.isPrimary,
      roleName: roleProfiles.name,
    })
    .from(employeeRoleAssignments)
    .leftJoin(roleProfiles, eq(roleProfiles.id, employeeRoleAssignments.roleProfileId))
    .where(eq(employeeRoleAssignments.workspaceId, input.workspaceId));
  const skillsRows = await db.select().from(skills).where(eq(skills.workspaceId, input.workspaceId));
  const ratings = await db.select().from(employeeSkillRatings).where(eq(employeeSkillRatings.workspaceId, input.workspaceId));
  const goals = await db.select().from(developmentGoals).where(eq(developmentGoals.workspaceId, input.workspaceId));
  const checkins = goals.length
    ? await db
        .select()
        .from(developmentGoalCheckins)
        .where(and(eq(developmentGoalCheckins.workspaceId, input.workspaceId), inArray(developmentGoalCheckins.goalId, goals.map((g) => g.id))))
    : [];
  const pilots = await db.select().from(pilotRuns).where(eq(pilotRuns.workspaceId, input.workspaceId));
  const pilotIds = pilots.map((p) => p.id);
  const participants = pilotIds.length
    ? await db
        .select({
          pilotId: pilotRunParticipants.pilotRunId,
          count: pilotRunParticipants.id,
        })
        .from(pilotRunParticipants)
        .where(and(eq(pilotRunParticipants.workspaceId, input.workspaceId), inArray(pilotRunParticipants.pilotRunId, pilotIds)))
    : [];

  const roleCounts = new Map<string, { name: string; count: number }>();
  assignments
    .filter((a) => a.isPrimary)
    .forEach((a) => {
      const current = roleCounts.get(a.roleId) ?? { name: a.roleName ?? "Роль", count: 0 };
      current.count += 1;
      roleCounts.set(a.roleId, current);
    });

  const employeeAvgLevel = new Map<string, number>();
  ratings.forEach((r) => {
    const key = `${r.workspaceId}:${r.employeeId}:${r.skillCode}`;
    const existing = employeeAvgLevel.get(key);
    if (existing === undefined) {
      employeeAvgLevel.set(key, r.level);
    } else {
      employeeAvgLevel.set(key, (existing + r.level) / 2);
    }
  });

  const avgSkillLevelByRole: QuarterlyReportPayload["skills"]["avgSkillLevelByRole"] = [];
  roleCounts.forEach((role, roleId) => {
    const employeesWithRole = assignments.filter((a) => a.isPrimary && a.roleId === roleId).map((a) => a.employeeId);
    const levels: number[] = [];
    ratings.forEach((r) => {
      if (employeesWithRole.includes(r.employeeId)) {
        levels.push(r.level);
      }
    });
    const avg = levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;
    avgSkillLevelByRole.push({ roleId, roleName: role.name, avgLevel: Number(avg.toFixed(2)) });
  });

  const riskSkillsMap = new Map<string, number>();
  ratings.forEach((r) => {
    if (r.level <= 2) {
      riskSkillsMap.set(r.skillCode, (riskSkillsMap.get(r.skillCode) ?? 0) + 1);
    }
  });
  const riskSkills = Array.from(riskSkillsMap.entries()).map(([skillCode, atRiskEmployees]) => ({ skillCode, atRiskEmployees }));

  const nowMs = end.getTime();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const checkinLatest = new Map<string, number>();
  checkins.forEach((c) => {
    const ts = Date.parse(c.createdAt ?? "");
    if (Number.isFinite(ts)) {
      const prev = checkinLatest.get(c.goalId);
      if (!prev || ts > prev) checkinLatest.set(c.goalId, ts);
    }
  });
  const completedLastQuarter = goals.filter((g) => g.status === "completed" && isInRange(g.updatedAt ?? g.createdAt, startIso, endIso)).length;
  const staleGoals = goals.filter((g) => g.status === "active" && (!checkinLatest.get(g.id) || nowMs - (checkinLatest.get(g.id) ?? 0) > thirtyDaysMs)).length;
  const highPriorityOverdue = goals.filter(
    (g) => g.status === "active" && g.priority === 1 && g.dueDate && Date.parse(g.dueDate) < end.getTime(),
  ).length;

  const pilotSummaries = pilots.map((p) => {
    const participantCount = participants.filter((part) => part.pilotId === p.id).length;
    return {
      pilotId: p.id,
      name: p.name,
      status: p.status,
      participants: participantCount,
      startDate: p.startDate ?? null,
      endDate: p.endDate ?? null,
    };
  });

  const decisions = await db.select().from(talentDecisions).where(eq(talentDecisions.workspaceId, input.workspaceId));

  const surveyRows = await db.select().from(feedbackSurveys).where(eq(feedbackSurveys.workspaceId, input.workspaceId));
  const responseRows = surveyRows.length
    ? await db
        .select()
        .from(feedbackResponses)
        .where(and(eq(feedbackResponses.workspaceId, input.workspaceId), inArray(feedbackResponses.surveyId, surveyRows.map((s) => s.id))))
    : [];
  const submittedResponseIds = responseRows.filter((r) => r.status === "submitted").map((r) => r.id);
  const answerRows = submittedResponseIds.length
    ? await db
        .select()
        .from(feedbackAnswers)
        .where(and(eq(feedbackAnswers.workspaceId, input.workspaceId), inArray(feedbackAnswers.responseId, submittedResponseIds)))
    : [];
  const scaleValues = answerRows.map((a) => a.scaleValue).filter((v) => v !== null && v !== undefined) as number[];
  const avgScaleOverall = scaleValues.length ? Number((scaleValues.reduce((a, b) => a + b, 0) / scaleValues.length).toFixed(2)) : null;

  return {
    period: { year: input.year, quarter: input.quarter, startDate: startIso, endDate: endIso },
    headcount: { totalEmployees: employeeRows.length, activeEmployees: employeeRows.length },
    roles: {
      totalRoles: roleRows.length,
      employeesPerRole: Array.from(roleCounts.entries()).map(([roleId, data]) => ({ roleId, roleName: data.name, count: data.count })),
    },
    skills: {
      trackedSkills: skillsRows.length,
      avgSkillLevelByRole,
      riskSkills,
    },
    developmentGoals: {
      totalGoals: goals.length,
      activeGoals: goals.filter((g) => g.status === "active").length,
      completedLastQuarter,
      staleGoals,
      highPriorityOverdue,
    },
    pilots: {
      activePilots: pilotSummaries.filter((p) => p.status === "active" || p.status === "planned").length,
      completedPilots: pilotSummaries.filter((p) => p.status === "completed").length,
      pilotSummaries,
    },
    decisions: {
      items: decisions.map((d) => ({
        id: d.id,
        text: d.title ?? d.type,
        ownerName: d.createdByUserId ?? undefined,
        dueDate: d.timeframe ?? null,
        status: d.status ?? undefined,
      })),
    },
    feedback: {
      surveysRun: surveyRows.length,
      responsesSubmitted: submittedResponseIds.length,
      avgScaleOverall,
    },
  };
}

export async function createOrUpdateQuarterlyReport(input: {
  workspaceId: string;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  title?: string;
  notes?: string | null;
  lock?: boolean;
  userId?: string;
}) {
  const existing = await db.query.quarterlyReports.findFirst({
    where: and(eq(quarterlyReports.workspaceId, input.workspaceId), eq(quarterlyReports.year, input.year), eq(quarterlyReports.quarter, input.quarter)),
  });
  const payload = await generateQuarterlyPayload({ workspaceId: input.workspaceId, year: input.year, quarter: input.quarter });
  const now = new Date();
  if (existing) {
    db.update(quarterlyReports)
      .set({
        title: input.title ?? existing.title,
        notes: input.notes ?? existing.notes,
        payload,
        updatedAt: now,
        generatedAt: now,
        generatedByUserId: input.userId ?? existing.generatedByUserId ?? null,
        isLocked: input.lock ?? existing.isLocked ?? false,
      })
      .where(eq(quarterlyReports.id, existing.id))
      .run();
    return getQuarterlyReportById({ workspaceId: input.workspaceId, reportId: existing.id });
  }
  const id = randomUUID();
  db.insert(quarterlyReports)
    .values({
      id,
      workspaceId: input.workspaceId,
      year: input.year,
      quarter: input.quarter,
      title: input.title ?? `Q${input.quarter} ${input.year} — People & Skills Report`,
      notes: input.notes ?? null,
      isLocked: input.lock ?? false,
      payload,
      createdAt: now,
      updatedAt: now,
      generatedAt: now,
      generatedByUserId: input.userId ?? null,
    })
    .run();
  return getQuarterlyReportById({ workspaceId: input.workspaceId, reportId: id });
}

export async function getQuarterlyReportById(input: { workspaceId: string; reportId: string }) {
  const record = await db.query.quarterlyReports.findFirst({
    where: and(eq(quarterlyReports.workspaceId, input.workspaceId), eq(quarterlyReports.id, input.reportId)),
  });
  if (!record) return null;
  const payload = parseQuarterlyReportPayload(record.payload);
  return { report: record, payload };
}

export async function getOrCreateQuarterlyReport(input: { workspaceId: string; year?: number; quarter?: 1 | 2 | 3 | 4 }): Promise<QuarterlyReportDTO> {
  const period = input.year && input.quarter ? { year: input.year, quarter: input.quarter } : deriveQuarter();
  const { year, quarter } = period;
  const existing = await db.query.quarterlyReports.findFirst({
    where: and(eq(quarterlyReports.workspaceId, input.workspaceId), eq(quarterlyReports.year, year), eq(quarterlyReports.quarter, quarter)),
  });
  let record: QuarterlyReport;
  if (existing) {
    record = existing;
  } else {
    const id = randomUUID();
    const now = new Date();
    db.insert(quarterlyReports)
      .values({
        id,
        workspaceId: input.workspaceId,
        year,
        quarter,
        title: `Q${quarter} ${year} — People & Skills Report`,
        notes: null,
        isLocked: false,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    record = (await db.query.quarterlyReports.findFirst({ where: eq(quarterlyReports.id, id) })) as QuarterlyReport;
  }
  const metrics = await computeQuarterlyMetrics({ workspaceId: input.workspaceId, year, quarter });
  const { topRisks, topWins, recommendedNextSteps } = await computeTopRisksAndWins({ workspaceId: input.workspaceId, year, quarter, metrics });
  return {
    id: record.id,
    workspaceId: record.workspaceId,
    period: { year, quarter: quarter as 1 | 2 | 3 | 4, label: `Q${quarter} ${year}` },
    title: record.title,
    notes: record.notes ?? null,
    isLocked: !!record.isLocked,
    metrics,
    topRisks,
    topWins,
    recommendedNextSteps,
  };
}

export async function getQuarterlyReportWithMetrics(input: {
  workspaceId: string;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  userId: string;
}): Promise<{ meta: QuarterlyReportDTO; summary: QuarterlyReportSummary }> {
  const meta = await getOrCreateQuarterlyReport({ workspaceId: input.workspaceId, year: input.year, quarter: input.quarter });
  const record = await db.query.quarterlyReports.findFirst({
    where: and(eq(quarterlyReports.workspaceId, input.workspaceId), eq(quarterlyReports.year, input.year), eq(quarterlyReports.quarter, input.quarter)),
  });

  if (record?.payload) {
    try {
      const parsed = record.payload as QuarterlyReportSummary;
      if (parsed && parsed.metrics) {
        return { meta, summary: { ...parsed, source: parsed.source ?? "from_cache" } };
      }
    } catch {
      // fall through to live rebuild
    }
  }

  const summary = await buildQuarterlyReportSummaryFromLiveData({
    workspaceId: input.workspaceId,
    year: input.year,
    quarter: input.quarter,
    userId: input.userId,
  });

  if (record) {
    db.update(quarterlyReports)
      .set({
        payload: summary as unknown,
        generatedAt: new Date(),
        generatedByUserId: input.userId,
      })
      .where(eq(quarterlyReports.id, record.id))
      .run();
    // уведомление о готовности отчёта только при первом расчёте
    try {
      const { createNotification } = await import("./notificationService");
      await createNotification({
        workspaceId: input.workspaceId,
        userId: input.userId,
        type: "quarterly_report_ready",
        title: `Готов квартальный отчёт Q${input.quarter} ${input.year}`,
        body: "Откройте квартальный отчёт, чтобы посмотреть метрики и топ-риски.",
        entityType: "report",
        entityId: record.id,
        url: `/app/reports/quarterly?year=${input.year}&quarter=${input.quarter}`,
      });
    } catch {
      // no-op
    }
  }

  return { meta, summary };
}

export async function buildQuarterlyReportSummaryFromLiveData(input: {
  workspaceId: string;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  userId: string;
}): Promise<QuarterlyReportSummary> {
  const { start, end } = getQuarterDateRange(input.year, input.quarter);
  const startMs = start.getTime();
  const endMs = end.getTime();
  const isInPeriod = (value: unknown) => {
    const ts = typeof value === "number" ? value : Date.parse(String(value));
    return Number.isFinite(ts) && ts >= startMs && ts <= endMs;
  };

  const employeeRows = await db
    .select({
      id: employees.id,
      name: employees.name,
      position: employees.position,
      level: employees.level,
      primaryTrackId: employees.primaryTrackId,
      createdAt: employees.createdAt,
    })
    .from(employees)
    .where(eq(employees.workspaceId, input.workspaceId));
  const decisionsRows = await db.select().from(talentDecisions).where(eq(talentDecisions.workspaceId, input.workspaceId));
  const pilotRows = await db.select().from(pilotRuns).where(eq(pilotRuns.workspaceId, input.workspaceId));
  const templateRows = await db.select().from(pilotTemplates).where(eq(pilotTemplates.workspaceId, input.workspaceId));
  const pilotTeams = await db.select().from(pilotRunTeams);

  const employeesTotal = employeeRows.length;
  const employeesAtRisk = new Set(
    decisionsRows.filter((d) => d.type === "monitor_risk" && isInPeriod(d.createdAt)).map((d) => d.employeeId),
  ).size;
  const employeesReadyForPromo = new Set(
    decisionsRows
      .filter(
        (d) =>
          (d.type === "promote" || d.type === "role_change") &&
          (d.status === "approved" || d.status === "implemented") &&
          isInPeriod(d.updatedAt ?? d.createdAt),
      )
      .map((d) => d.employeeId),
  ).size;
  const newHires = employeeRows.filter((e) => isInPeriod(e.createdAt)).length;
  const leavers = 0; // TODO: учитывать увольнения/архивных сотрудников, когда появятся поля
  const pilotsInPeriod = pilotRows.filter((p) => isInPeriod(p.createdAt));
  const pilotsCount = pilotsInPeriod.length;
  const pilotsFromTemplates = pilotsInPeriod.filter((p) => p.origin === "template").length;
  const pilotsManual = pilotsInPeriod.length - pilotsFromTemplates;
  const decisionsCount = decisionsRows.filter((d) => isInPeriod(d.createdAt)).length;

  const topRisks = decisionsRows
    .filter((d) => d.type === "monitor_risk" && isInPeriod(d.createdAt))
    .slice(0, 10)
    .map((d) => {
      const emp = employeeRows.find((e) => e.id === d.employeeId);
      return {
        employeeId: d.employeeId,
        employeeName: emp?.name ?? "Сотрудник",
        role: emp?.position ?? null,
        riskReasons: [d.title ?? "Риск по сотруднику"],
      };
    });

  const topWins = decisionsRows
    .filter(
      (d) =>
        (d.type === "promote" || d.type === "role_change" || d.type === "lateral_move") &&
        d.status === "implemented" &&
        isInPeriod(d.updatedAt ?? d.createdAt),
    )
    .slice(0, 10)
    .map((d) => {
      const emp = employeeRows.find((e) => e.id === d.employeeId);
      return {
        employeeId: d.employeeId,
        employeeName: emp?.name ?? null,
        role: emp?.position ?? null,
        winReasons: [d.title ?? "Изменение по сотруднику"],
      };
    });

  const employeesTable = employeeRows.map((emp) => {
    const empDecisions = decisionsRows.filter((d) => d.employeeId === emp.id);
    const inRisk = empDecisions.some((d) => d.type === "monitor_risk" && d.status !== "rejected");
    const readyForPromo = empDecisions.some(
      (d) => (d.type === "promote" || d.type === "role_change") && (d.status === "approved" || d.status === "implemented"),
    );
    const involvedPilots = pilotTeams
      .filter((pt) => pt.teamId === emp.primaryTrackId)
      .filter((pt) => pilotRows.some((p) => p.id === pt.pilotRunId && isInPeriod(p.createdAt))).length;
    const lastDecision = empDecisions
      .map((d) => Date.parse(String(d.updatedAt ?? d.createdAt)))
      .filter((ts) => Number.isFinite(ts))
      .sort((a, b) => b - a)[0];

    return {
      id: emp.id,
      name: emp.name,
      role: emp.position ?? null,
      level: emp.level ?? null,
      status: null,
      isAtRisk: inRisk,
      isReadyForPromo: readyForPromo,
      artifactsCount: 0, // TODO: связать с артефактами/интеграциями
      pilotsInvolved: involvedPilots,
      lastDecisionAt: lastDecision ? new Date(lastDecision).toISOString() : null,
      summary: readyForPromo ? "Готов к промо" : inRisk ? "В зоне риска" : "OK",
    };
  });

  const summaryParagraph = buildSummaryText({
    employeesTotal,
    employeesAtRisk,
    employeesReadyForPromo,
    newHires,
    leavers,
    pilotsCount,
    decisionsCount,
  });

  return {
    workspaceId: input.workspaceId,
    year: input.year,
    quarter: input.quarter,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    generatedAt: new Date().toISOString(),
    source: "from_live_data",
    metrics: {
      employeesTotal,
      employeesAtRisk,
      employeesReadyForPromo,
      newHires,
      leavers,
      pilotsCount,
      pilotsFromTemplates,
      pilotsManual,
      decisionsCount,
    },
    topRisks,
    topWins,
    topTemplates:
      templateRows.length === 0
        ? []
        : templateRows
            .map((tpl) => ({
              templateId: tpl.id,
              title: tpl.title,
              used: pilotsInPeriod.filter((p) => p.templateId === tpl.id).length,
            }))
            .filter((t) => t.used > 0)
            .sort((a, b) => b.used - a.used)
            .slice(0, 5),
    employees: employeesTable,
    summaryParagraph,
  };
}

export async function updateQuarterlyReportMetadata(input: {
  workspaceId: string;
  reportId: string;
  title?: string;
  notes?: string | null;
  isLocked?: boolean;
}): Promise<QuarterlyReportDTO | null> {
  const existing = await db.query.quarterlyReports.findFirst({
    where: and(eq(quarterlyReports.id, input.reportId), eq(quarterlyReports.workspaceId, input.workspaceId)),
  });
  if (!existing) return null;
  db.update(quarterlyReports)
    .set({
      title: input.title ?? existing.title,
      notes: input.notes ?? existing.notes,
      isLocked: input.isLocked ?? existing.isLocked,
      updatedAt: new Date(),
    })
    .where(eq(quarterlyReports.id, input.reportId))
    .run();
  return getOrCreateQuarterlyReport({ workspaceId: input.workspaceId, year: existing.year, quarter: existing.quarter as 1 | 2 | 3 | 4 });
}

export async function computeQuarterlyMetrics(input: { workspaceId: string; year: number; quarter: 1 | 2 | 3 | 4 }): Promise<QuarterlyMetricSummary> {
  const { start, end } = getQuarterDateRange(input.year, input.quarter);
  const startMs = start.getTime();
  const endMs = end.getTime();

  const pilotsRows = await db.select().from(pilotRuns).where(eq(pilotRuns.workspaceId, input.workspaceId));
  const decisionsRows = await db.select().from(talentDecisions).where(eq(talentDecisions.workspaceId, input.workspaceId));

  const isInPeriod = (value: unknown) => {
    const ts = typeof value === "number" ? value : Date.parse(String(value));
    return Number.isFinite(ts) && ts >= startMs && ts <= endMs;
  };

  const pilotsInPeriod = pilotsRows.filter((pilot) => isInPeriod(pilot.createdAt));
  const pilotsTotal = pilotsInPeriod.length;
  const pilotsCompleted = pilotsInPeriod.filter((p) => p.status === "completed").length;
  const pilotsInProgress = pilotsInPeriod.filter((p) => p.status === "active" || p.status === "planned").length;

  const decisionsInPeriod: TalentDecision[] = decisionsRows.filter((d) => isInPeriod(d.createdAt));
  const decisionsTotal = decisionsInPeriod.length;
  const decisionsProposed = decisionsInPeriod.filter((d) => d.status === "proposed").length;
  const decisionsApproved = decisionsInPeriod.filter((d) => d.status === "approved").length;
  const decisionsImplemented = decisionsRows.filter((d) => d.status === "implemented" && isInPeriod(d.updatedAt ?? d.createdAt)).length;
  const decisionsRejected = decisionsInPeriod.filter((d) => d.status === "rejected").length;
  const promotionsCount = decisionsRows.filter(
    (d) => d.type === "promote" && d.status === "implemented" && isInPeriod(d.updatedAt ?? d.createdAt),
  ).length;
  const lateralMovesCount = decisionsRows.filter(
    (d) => (d.type === "lateral_move" || d.type === "role_change") && d.status === "implemented" && isInPeriod(d.updatedAt ?? d.createdAt),
  ).length;
  const employeesAtRisk = new Set(
    decisionsRows
      .filter((d) => d.type === "monitor_risk" && isInPeriod(d.createdAt))
      .map((d) => d.employeeId),
  ).size;
  const employeesTouched = new Set(decisionsInPeriod.map((d) => d.employeeId)).size; // TODO: учитывать участие в пилотах/встречах

  const criticalSkillGaps = 0; // TODO: интегрировать с Skills & Gaps (avgDelta/weight)

  return {
    period: { year: input.year, quarter: input.quarter, label: `Q${input.quarter} ${input.year}` },
    pilotsTotal,
    pilotsCompleted,
    pilotsInProgress,
    employeesTouched,
    employeesAtRisk,
    promotionsCount,
    lateralMovesCount,
    decisionsTotal,
    decisionsProposed,
    decisionsApproved,
    decisionsImplemented,
    decisionsRejected,
    criticalSkillGaps,
    skillsImprovedCount: null,
  };
}

export async function computeTopRisksAndWins(input: {
  workspaceId: string;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  metrics?: QuarterlyMetricSummary;
}) {
  const { start, end } = getQuarterDateRange(input.year, input.quarter);
  const startMs = start.getTime();
  const endMs = end.getTime();
  const decisionsRows = await db.select().from(talentDecisions).where(eq(talentDecisions.workspaceId, input.workspaceId));
  const employeeRows = await db.select().from(employees).where(eq(employees.workspaceId, input.workspaceId));
  const trackRows = await db.select().from(tracks).where(eq(tracks.workspaceId, input.workspaceId));
  const employeeMap = new Map(employeeRows.map((e) => [e.id, e]));
  const trackMap = new Map(trackRows.map((t) => [t.id, t.name]));

  const isInPeriod = (value: unknown) => {
    const ts = typeof value === "number" ? value : Date.parse(String(value));
    return Number.isFinite(ts) && ts >= startMs && ts <= endMs;
  };

  const riskDecisions = decisionsRows.filter((d) => d.type === "monitor_risk" && isInPeriod(d.createdAt));
  const topRisks = riskDecisions.slice(0, 5).map((d) => {
    const emp = employeeMap.get(d.employeeId);
    return {
      employeeId: d.employeeId,
      employeeName: emp?.name ?? "Сотрудник",
      teamName: emp?.primaryTrackId ? trackMap.get(emp.primaryTrackId) ?? null : null,
      reason: d.title ?? "Риск по сотруднику",
    };
  });
  // Потенциально тяжёлая операция: при генерации отчёта создаём кейсы по топ-рискам, если их ещё нет.
  void syncReportRiskCases(input.workspaceId, topRisks);

  const winDecisions = decisionsRows.filter(
    (d) => (d.type === "promote" || d.type === "role_change" || d.type === "lateral_move") && d.status === "implemented" && isInPeriod(d.updatedAt ?? d.createdAt),
  );
  const topWins = winDecisions.slice(0, 5).map((d) => {
    const emp = employeeMap.get(d.employeeId);
    return {
      employeeId: d.employeeId,
      label: d.title ?? "Изменение по сотруднику",
      description: emp?.name ? `${emp.name} · ${d.type}` : d.type,
    };
  });

  const recommendedNextSteps: string[] = [];
  const metrics = input.metrics ?? (await computeQuarterlyMetrics(input));
  if (metrics.decisionsTotal > 0 && metrics.decisionsImplemented < metrics.decisionsTotal / 2) {
    recommendedNextSteps.push(`Сфокусироваться на закрытии ${metrics.decisionsTotal - metrics.decisionsImplemented} открытых решений по людям.`);
  }
  if (metrics.pilotsInProgress > 0) {
    recommendedNextSteps.push(`Довести до завершения ${metrics.pilotsInProgress} активных пилотов и собрать отчёты.`);
  }
  if (metrics.employeesAtRisk > 0) {
    recommendedNextSteps.push(`Снять риски для ${metrics.employeesAtRisk} сотрудников (коучинг, задачи, замены).`);
  }
  if (recommendedNextSteps.length === 0) {
    recommendedNextSteps.push("Продолжать регулярный мониторинг навыков и решений.");
  }

  return { topRisks, topWins, recommendedNextSteps };
}

function buildSummaryText(input: {
  employeesTotal: number;
  employeesAtRisk: number;
  employeesReadyForPromo: number;
  newHires: number;
  leavers: number;
  pilotsCount: number;
  decisionsCount: number;
}) {
  return `За квартал: сотрудников ${input.employeesTotal}, новых наймов ${input.newHires}, ушедших ${input.leavers}. В риске ${input.employeesAtRisk}, готовых к промо ${input.employeesReadyForPromo}. Пилоты ${input.pilotsCount}, решений ${input.decisionsCount}.`;
}

async function syncReportRiskCases(
  workspaceId: string,
  risks: Array<{ employeeId: string; employeeName: string; reason: string }>,
) {
  for (const risk of risks) {
    try {
      await ensureRiskCase({
        workspaceId,
        employeeId: risk.employeeId,
        level: "high",
        source: "report",
        title: risk.reason || "Риск по сотруднику",
        reason: `Отчёт: ${risk.reason}`,
        recommendation: "Назначьте ответственное лицо и план действий по итогам отчёта.",
      });
    } catch (error) {
      logger.warn("risk_case_report_sync_failed", {
        workspaceId,
        employeeId: risk.employeeId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

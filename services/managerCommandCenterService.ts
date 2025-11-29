import { and, eq, inArray, lt, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { employees, notificationTypes, pilotRunSteps, pilotRuns, riskCases, type PilotRunStatus, type RiskLevel, type RiskStatus } from "@/drizzle/schema";
import { getManagerAgenda } from "@/services/managerAgendaService";
import { listRiskCases } from "@/services/riskCenterService";
import { getUserNotifications } from "@/services/notificationService";

export type ManagerSummaryCounters = {
  employeesTotal: number;
  employeesAtRisk: number;
  pilotsActive: number;
  pilotsFromTemplates: number;
  pilotStepsOverdue: number;
};

export type ManagerUpcomingItem = {
  id: string;
  kind: "pilot_step" | "one_on_one" | "report_deadline" | "custom";
  title: string;
  employeeId?: string;
  employeeName?: string;
  dueDate: Date;
  url?: string;
};

export type ManagerRiskHighlight = {
  caseId: string;
  employeeId: string;
  employeeName: string;
  level: RiskLevel;
  status: RiskStatus;
  title: string;
  detectedAt: Date;
  url: string;
};

export type ManagerPilotHighlight = {
  pilotId: string;
  employeeId?: string;
  employeeName?: string;
  title: string;
  status: PilotRunStatus | "planned" | "paused";
  progressPercent?: number;
  endDate?: Date | null;
  isFromTemplate: boolean;
  url: string;
};

export type ManagerNotificationPreview = {
  id: string;
  type: (typeof notificationTypes)[number] | string;
  title: string;
  createdAt: Date;
  isRead: boolean;
  url?: string | null;
};

export type ManagerCommandCenterSnapshot = {
  summary: ManagerSummaryCounters;
  upcoming: ManagerUpcomingItem[];
  risks: ManagerRiskHighlight[];
  pilots: ManagerPilotHighlight[];
  notifications: ManagerNotificationPreview[];
};

const OPEN_RISK_STATUSES: RiskStatus[] = ["open", "monitoring"];
const ACTIVE_PILOT_STATUSES: PilotRunStatus[] = ["active", "draft", "planned" as PilotRunStatus];
const RISK_TABLE_REGEX = /risk_cases/i;

export async function getManagerCommandCenterSnapshot(input: {
  workspaceId: string;
  managerUserId: string;
  lookaheadDays?: number;
}): Promise<ManagerCommandCenterSnapshot> {
  const lookaheadDays = Math.max(1, input.lookaheadDays ?? 7);
  const now = new Date();
  const from = startOfDay(now);
  const to = addDays(from, lookaheadDays);

  const summary = await buildSummary(input.workspaceId, input.managerUserId);
  const upcoming = await buildUpcoming({ workspaceId: input.workspaceId, managerUserId: input.managerUserId, from, to });
  const risks = await buildRisks(input.workspaceId, input.managerUserId);
  const pilots = await buildPilots(input.workspaceId, input.managerUserId);
  const notifications = await buildNotifications(input.workspaceId, input.managerUserId);

  return {
    summary,
    upcoming,
    risks,
    pilots,
    notifications,
  };
}

async function buildSummary(workspaceId: string, managerUserId: string): Promise<ManagerSummaryCounters> {
  const [{ count: employeesTotal }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(employees)
    .where(eq(employees.workspaceId, workspaceId));

  let employeesAtRisk = 0;
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(riskCases)
      .where(and(eq(riskCases.workspaceId, workspaceId), eq(riskCases.ownerUserId, managerUserId), inArray(riskCases.status, OPEN_RISK_STATUSES)));
    employeesAtRisk = Number(count ?? 0);
  } catch (error) {
    if (!(error instanceof Error && RISK_TABLE_REGEX.test(error.message ?? ""))) {
      throw error;
    }
  }

  const pilotRows = await db
    .select()
    .from(pilotRuns)
    .where(and(eq(pilotRuns.workspaceId, workspaceId), eq(pilotRuns.ownerUserId, managerUserId), ne(pilotRuns.status, "archived")));
  const pilotsActive = pilotRows.filter((p) => ACTIVE_PILOT_STATUSES.includes(p.status)).length;
  const pilotsFromTemplates = pilotRows.filter((p) => p.origin === "template" && ACTIVE_PILOT_STATUSES.includes(p.status)).length;

  const overdueSteps = await db
    .select()
    .from(pilotRunSteps)
    .leftJoin(pilotRuns, eq(pilotRunSteps.pilotRunId, pilotRuns.id))
    .where(
      and(
        eq(pilotRuns.workspaceId, workspaceId),
        eq(pilotRuns.ownerUserId, managerUserId),
        lt(pilotRunSteps.dueDate, new Date().toISOString()),
        inArray(pilotRunSteps.status, ["pending", "in_progress"]),
      ),
    );

  return {
    employeesTotal: Number(employeesTotal ?? 0),
    employeesAtRisk,
    pilotsActive,
    pilotsFromTemplates,
    pilotStepsOverdue: overdueSteps.length,
  };
}

async function buildUpcoming(params: { workspaceId: string; managerUserId: string; from: Date; to: Date }): Promise<ManagerUpcomingItem[]> {
  const agenda = await getManagerAgenda({
    workspaceId: params.workspaceId,
    userId: params.managerUserId,
    from: params.from,
    to: params.to,
  });
  const items: ManagerUpcomingItem[] = [];
  agenda.days.forEach((day) => {
    day.items.forEach((item) => {
      const kind = mapAgendaKind(item.kind);
      items.push({
        id: item.id,
        kind,
        title: item.title,
        employeeId: item.employeeId,
        employeeName: item.employeeName,
        dueDate: day.date,
        url: item.linkHref,
      });
    });
  });
  return items.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()).slice(0, 20);
}

async function buildRisks(workspaceId: string, managerUserId: string): Promise<ManagerRiskHighlight[]> {
  const result = await listRiskCases({
    workspaceId,
    statuses: OPEN_RISK_STATUSES,
    ownerUserId: managerUserId,
    limit: 5,
  });
  const severity = { high: 3, medium: 2, low: 1 } as const;
  return result.items
    .sort((a, b) => severity[b.level] - severity[a.level] || b.detectedAt.getTime() - a.detectedAt.getTime())
    .slice(0, 5)
    .map((item) => ({
      caseId: item.id,
      employeeId: item.employeeId,
      employeeName: item.employeeName,
      level: item.level,
      status: item.status,
      title: item.title,
      detectedAt: item.detectedAt,
      url: `/app/risk-center?caseId=${item.id}`,
    }));
}

async function buildPilots(workspaceId: string, managerUserId: string): Promise<ManagerPilotHighlight[]> {
  const pilots = await db
    .select()
    .from(pilotRuns)
    .where(and(eq(pilotRuns.workspaceId, workspaceId), eq(pilotRuns.ownerUserId, managerUserId), ne(pilotRuns.status, "archived")));
  const pilotIds = pilots.map((p) => p.id);
  const steps = pilotIds.length
    ? await db.select().from(pilotRunSteps).where(inArray(pilotRunSteps.pilotRunId, pilotIds))
    : [];
  const stepsByPilot = new Map<string, typeof steps>();
  steps.forEach((step) => {
    const list = stepsByPilot.get(step.pilotRunId) ?? [];
    list.push(step);
    stepsByPilot.set(step.pilotRunId, list);
  });
  return pilots
    .map((pilot) => {
      const pilotSteps = stepsByPilot.get(pilot.id) ?? [];
      const completed = pilotSteps.filter((s) => s.status === "done").length;
      const progressPercent = pilotSteps.length ? Math.round((completed / pilotSteps.length) * 100) : undefined;
      return {
        pilotId: pilot.id,
        employeeId: undefined,
        employeeName: undefined,
        title: pilot.name,
        status: pilot.status,
        progressPercent,
        endDate: null,
        isFromTemplate: pilot.origin === "template",
        url: `/app/pilot/${pilot.id}`,
      } satisfies ManagerPilotHighlight;
    })
    .sort((a, b) => {
      const aDate = pilots.find((p) => p.id === a.pilotId)?.updatedAt ?? null;
      const bDate = pilots.find((p) => p.id === b.pilotId)?.updatedAt ?? null;
      const aTs = aDate ? Date.parse(String(aDate)) : 0;
      const bTs = bDate ? Date.parse(String(bDate)) : 0;
      return bTs - aTs;
    })
    .slice(0, 5);
}

async function buildNotifications(workspaceId: string, userId: string): Promise<ManagerNotificationPreview[]> {
  const result = await getUserNotifications({ workspaceId, userId, limit: 10 });
  return result.items.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    createdAt: new Date(item.createdAt),
    isRead: item.isRead,
    url: item.url ?? undefined,
  }));
}

function mapAgendaKind(kind: string): ManagerUpcomingItem["kind"] {
  if (kind === "pilot_review") return "pilot_step";
  if (kind === "meeting") return "one_on_one";
  if (kind === "decision_deadline" || kind === "risk_check") return "report_deadline";
  return "custom";
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

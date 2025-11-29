import { and, desc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import {
  employees,
  meetingAgendas,
  pilotRuns,
  reports,
  talentDecisions,
  tracks,
  type TalentDecisionStatus,
} from "@/drizzle/schema";
import type { TalentDecisionDTO, TalentDecisionType } from "@/services/types/talentDecision";

type DecisionFilters = {
  employeeId?: string;
  status?: TalentDecisionStatus | TalentDecisionStatus[];
  type?: TalentDecisionType | TalentDecisionType[];
  teamId?: string;
  onlyOpen?: boolean;
  sourceType?: "pilot" | "report" | "meeting" | "manual";
  sourceId?: string;
};

export async function createDecision(input: {
  workspaceId: string;
  createdByUserId: string;
  employeeId: string;
  type: TalentDecisionType;
  status?: TalentDecisionStatus;
  priority?: "low" | "medium" | "high";
  sourceType: "pilot" | "report" | "meeting" | "manual";
  sourceId?: string | null;
  title: string;
  rationale: string;
  risks?: string | null;
  timeframe?: string | null;
}): Promise<TalentDecisionDTO> {
  const id = randomUUID();
  const now = new Date();
  db.insert(talentDecisions)
    .values({
      id,
      workspaceId: input.workspaceId,
      employeeId: input.employeeId,
      type: input.type,
      status: input.status ?? "proposed",
      priority: input.priority ?? "medium",
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      title: input.title,
      rationale: input.rationale,
      risks: input.risks ?? null,
      timeframe: input.timeframe ?? null,
      createdByUserId: input.createdByUserId,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  const created = await getDecisionById({ workspaceId: input.workspaceId, decisionId: id });
  if (!created) {
    throw new Error("FAILED_TO_CREATE_TALENT_DECISION");
  }
  if (input.type === "monitor_risk") {
    await import("./notificationService").then(({ createNotification }) =>
      createNotification({
        workspaceId: input.workspaceId,
        userId: input.createdByUserId,
        type: "risk_employee",
        title: `Сотрудник в риске: ${created.employeeName}`,
        body: input.title,
        entityType: "team",
        entityId: created.employeeId,
        url: `/app/employee/${created.employeeId}`,
      }),
    );
  }
  return created;
}

export async function updateDecisionStatus(input: {
  workspaceId: string;
  userId: string;
  decisionId: string;
  status: TalentDecisionStatus;
}): Promise<TalentDecisionDTO> {
  const existing = await db.query.talentDecisions.findFirst({
    where: and(eq(talentDecisions.id, input.decisionId), eq(talentDecisions.workspaceId, input.workspaceId)),
  });
  if (!existing) {
    throw new Error("TALENT_DECISION_NOT_FOUND");
  }
  db.update(talentDecisions)
    .set({ status: input.status, updatedAt: new Date() })
    .where(and(eq(talentDecisions.id, input.decisionId), eq(talentDecisions.workspaceId, input.workspaceId)))
    .run();
  const updated = await getDecisionById({ workspaceId: input.workspaceId, decisionId: input.decisionId });
  if (!updated) throw new Error("TALENT_DECISION_NOT_FOUND_AFTER_UPDATE");
  return updated;
}

export async function listDecisions(input: { workspaceId: string; filters?: DecisionFilters }): Promise<TalentDecisionDTO[]> {
  const filters = input.filters ?? {};
  const clauses = [eq(talentDecisions.workspaceId, input.workspaceId)];
  if (filters.employeeId) {
    clauses.push(eq(talentDecisions.employeeId, filters.employeeId));
  }
  if (filters.status) {
    const values = Array.isArray(filters.status) ? filters.status : [filters.status];
    clauses.push(inArray(talentDecisions.status, values));
  } else if (filters.onlyOpen) {
    clauses.push(inArray(talentDecisions.status, ["proposed", "approved"]));
  }
  if (filters.type) {
    const values = Array.isArray(filters.type) ? filters.type : [filters.type];
    clauses.push(inArray(talentDecisions.type, values));
  }
  if (filters.sourceType) {
    clauses.push(eq(talentDecisions.sourceType, filters.sourceType));
  }
  if (filters.sourceId) {
    clauses.push(eq(talentDecisions.sourceId, filters.sourceId));
  }

  const rows = await db
    .select({
      decision: talentDecisions,
      employeeName: employees.name,
      employeeRole: employees.position,
      teamName: tracks.name,
      teamId: employees.primaryTrackId,
    })
    .from(talentDecisions)
    .leftJoin(employees, eq(talentDecisions.employeeId, employees.id))
    .leftJoin(tracks, eq(employees.primaryTrackId, tracks.id))
    .where(and(...clauses))
    .orderBy(desc(talentDecisions.createdAt));

  const filteredByTeam = filters.teamId ? rows.filter((row) => row.teamId === filters.teamId) : rows;
  const sourceLabels = await buildSourceLabels(rows.map((row) => row.decision));
  return filteredByTeam.map((row) => mapDecisionRow(row, sourceLabels));
}

export async function getDecisionById(input: { workspaceId: string; decisionId: string }): Promise<TalentDecisionDTO | null> {
  const rows = await db
    .select({
      decision: talentDecisions,
      employeeName: employees.name,
      employeeRole: employees.position,
      teamName: tracks.name,
    })
    .from(talentDecisions)
    .leftJoin(employees, eq(talentDecisions.employeeId, employees.id))
    .leftJoin(tracks, eq(employees.primaryTrackId, tracks.id))
    .where(and(eq(talentDecisions.id, input.decisionId), eq(talentDecisions.workspaceId, input.workspaceId)))
    .limit(1);
  if (!rows.length) return null;
  const sourceLabels = await buildSourceLabels([rows[0].decision]);
  return mapDecisionRow(rows[0], sourceLabels);
}

function mapDecisionRow(
  row: {
    decision: typeof talentDecisions.$inferSelect;
    employeeName: string | null;
    employeeRole: string | null;
    teamName: string | null;
    teamId?: string | null;
  },
  sourceLabels: Map<string, string>,
): TalentDecisionDTO {
  const decision = row.decision;
  const key = decision.sourceId ? `${decision.sourceType}:${decision.sourceId}` : "";
  return {
    id: decision.id,
    workspaceId: decision.workspaceId,
    employeeId: decision.employeeId,
    employeeName: row.employeeName ?? "Неизвестно",
    employeeRole: row.employeeRole,
    teamName: row.teamName,
    type: decision.type as TalentDecisionDTO["type"],
    status: decision.status as TalentDecisionDTO["status"],
    priority: decision.priority as TalentDecisionDTO["priority"],
    sourceType: decision.sourceType as TalentDecisionDTO["sourceType"],
    sourceId: decision.sourceId ?? null,
    sourceLabel: key ? sourceLabels.get(key) ?? null : null,
    title: decision.title,
    rationale: decision.rationale,
    risks: decision.risks ?? null,
    timeframe: decision.timeframe ?? null,
    createdByUserId: decision.createdByUserId,
    createdAt: new Date(decision.createdAt),
    updatedAt: new Date(decision.updatedAt),
  };
}

async function buildSourceLabels(decisions: typeof talentDecisions.$inferSelect[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const pilotIds = decisions.filter((d) => d.sourceType === "pilot" && d.sourceId).map((d) => d.sourceId!) as string[];
  const reportIds = decisions.filter((d) => d.sourceType === "report" && d.sourceId).map((d) => d.sourceId!) as string[];
  const meetingIds = decisions.filter((d) => d.sourceType === "meeting" && d.sourceId).map((d) => d.sourceId!) as string[];

  if (pilotIds.length) {
    const rows = await db.select({ id: pilotRuns.id, name: pilotRuns.name }).from(pilotRuns).where(inArray(pilotRuns.id, pilotIds));
    rows.forEach((row) => map.set(`pilot:${row.id}`, row.name));
  }
  if (reportIds.length) {
    const rows = await db.select({ id: reports.id, title: reports.title }).from(reports).where(inArray(reports.id, reportIds));
    rows.forEach((row) => map.set(`report:${row.id}`, row.title));
  }
  if (meetingIds.length) {
    const rows = await db.select({ id: meetingAgendas.id, title: meetingAgendas.title }).from(meetingAgendas).where(inArray(meetingAgendas.id, meetingIds));
    rows.forEach((row) => map.set(`meeting:${row.id}`, row.title));
  }
  // TODO: support auto-created decisions from meetings/pilots when extra context is available.
  return map;
}

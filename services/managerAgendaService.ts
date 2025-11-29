import { and, eq, gte, inArray, lt, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  developmentGoals,
  employees,
  feedbackResponses,
  feedbackSurveys,
  meetingAgendas,
  oneOnOnes,
  pilotRunSteps,
  pilotRuns,
  talentDecisions,
  workspacePrograms,
} from "@/drizzle/schema";
import { computeSkillProfileForEmployee } from "@/services/skillGapService";

export type ManagerAgendaItemKind = "meeting" | "pilot_review" | "decision_deadline" | "action_from_home" | "risk_check";
export type ManagerAgendaPriority = "high" | "medium" | "low";
export type ManagerAgendaItem = {
  id: string;
  kind: ManagerAgendaItemKind;
  title: string;
  priority: ManagerAgendaPriority;
  employeeId?: string;
  employeeName?: string;
  linkHref?: string;
};
export type ManagerAgendaDay = { date: Date; items: ManagerAgendaItem[] };

export async function getManagerAgenda(input: { workspaceId: string; userId: string; from: Date; to: Date }): Promise<{ days: ManagerAgendaDay[] }> {
  const start = startOfDay(input.from);
  const end = startOfDay(input.to);
  const dayMap = buildDayMap(start, end);
  const employeeRows = await db.select({ id: employees.id, name: employees.name }).from(employees).where(eq(employees.workspaceId, input.workspaceId));
  const employeeNameMap = new Map(employeeRows.map((row) => [row.id, row.name ?? row.id]));

  // Meetings created by менеджер
  const meetings = await safeQuery(() =>
    db
      .select()
      .from(meetingAgendas)
      .where(
        and(
          eq(meetingAgendas.workspaceId, input.workspaceId),
          gte(meetingAgendas.scheduledAt, start.toISOString()),
          lte(meetingAgendas.scheduledAt, addDays(end, 1).toISOString()),
        ),
      ),
  );
  meetings.forEach((meeting) => {
    if (!meeting.scheduledAt) return;
    const date = new Date(meeting.scheduledAt);
    if (!isInRange(date, start, end)) return;
    pushAgendaItem(dayMap, date, {
      id: meeting.id,
      kind: "meeting",
      title: meeting.title ?? "Встреча",
      priority: "medium",
      linkHref: `/app/meetings/${meeting.id}`,
    });
  });

  // Открытые решения по людям
  const decisionRows = await safeQuery(() =>
    db
      .select()
      .from(talentDecisions)
      .where(and(eq(talentDecisions.workspaceId, input.workspaceId), inArray(talentDecisions.status, ["proposed", "approved"]))),
  );
  decisionRows.forEach((decision) => {
    const date = decision.updatedAt ? new Date(decision.updatedAt) : new Date(decision.createdAt);
    if (!isInRange(date, start, end)) return;
    const priority = decision.priority === "high" ? "high" : decision.priority === "low" ? "low" : "medium";
    pushAgendaItem(dayMap, date, {
      id: decision.id,
      kind: "decision_deadline",
      title: decision.title,
      employeeId: decision.employeeId,
      employeeName: employeeNameMap.get(decision.employeeId),
      priority,
      linkHref: `/app/decisions?focus=${decision.id}`,
    });
  });

  // Шаги пилотов владельца
  const pilotStepsRows = await safeQuery(() =>
    db
      .select({ step: pilotRunSteps, pilot: pilotRuns })
      .from(pilotRunSteps)
      .leftJoin(pilotRuns, eq(pilotRunSteps.pilotRunId, pilotRuns.id))
      .where(and(eq(pilotRuns.workspaceId, input.workspaceId), eq(pilotRuns.ownerUserId, input.userId))),
  );
  pilotStepsRows.forEach((row) => {
    const due = row.step.dueDate ? new Date(row.step.dueDate) : null;
    if (!due || !isInRange(due, start, end)) return;
    const isOverdue = due < startOfDay(new Date()) && (row.step.status === "pending" || row.step.status === "in_progress");
    const priority: ManagerAgendaPriority = isOverdue ? "high" : "medium";
    const pilotTitle = row.pilot?.name ? `Пилот: ${row.pilot.name}` : "Пилот";
    pushAgendaItem(dayMap, due, {
      id: row.step.id,
      kind: "pilot_review",
      title: row.step.title ? `${pilotTitle} — ${row.step.title}` : pilotTitle,
      priority,
      linkHref: row.pilot ? `/app/pilot/${row.pilot.id}` : undefined,
    });
  });

  const days = Array.from(dayMap.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((day) => ({
      ...day,
      items: day.items.sort((a, b) => priorityIndex(a.priority) - priorityIndex(b.priority)),
    }));

  return { days };
}

export type ManagerAgendaSnapshot = {
  managerId: string;
  workspaceId: string;
  period: { start: string; end: string };
  team: { teamSize: number; employeesWithoutRecent1on1: number; employeesWithoutGoals: number };
  upcomingOneOnOnes: { id: string; employeeId: string; employeeName: string; scheduledAt: string; status: "scheduled" | "rescheduled"; location?: string | null }[];
  overdueOneOnOnes: { id: string; employeeId: string; employeeName: string; scheduledAt: string; daysOverdue: number }[];
  goals: {
    activeGoals: { id: string; employeeId: string; employeeName: string; title: string; targetDate: string | null; status: "active" | "overdue" }[];
    completedLast30d: { id: string; employeeId: string; employeeName: string; title: string; completedAt: string }[];
  };
  skillGaps: {
    criticalSkills: { skillId: string; skillName: string; avgGap: number; affectedEmployees: number }[];
    employeesWithHighGap: { employeeId: string; employeeName: string; topSkillName: string; gap: number }[];
  };
  feedback: {
    activeSurveysForTeam: { surveyId: string; title: string; dueDate: string | null; responseRate: number | null }[];
    lastPulseForTeamSentAt: string | null;
    lastPulseSentiment: "positive" | "neutral" | "negative" | null;
  };
  programs: {
    activeProgramsForTeam: { id: string; name: string; participantsCount: number; hasRecentOutcomes: boolean }[];
    suggestedProgramsByGap: { roleId: string | null; skillId: string | null; skillName: string; programId: string | null; programName: string | null; affectedEmployees: number }[];
  };
};

export async function getManagerAgendaSnapshot(input: { workspaceId: string; managerId: string; start?: Date; end?: Date }): Promise<ManagerAgendaSnapshot> {
  const start = input.start ?? new Date();
  const end = input.end ?? addDays(start, 7);
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const oneOnOneRows = await db
    .select()
    .from(oneOnOnes)
    .where(and(eq(oneOnOnes.workspaceId, input.workspaceId), eq(oneOnOnes.managerId, input.managerId)));
  const employeeIds = Array.from(new Set(oneOnOneRows.map((o) => o.employeeId)));
  const employeeRows = employeeIds.length
    ? await db.select({ id: employees.id, name: employees.name }).from(employees).where(and(eq(employees.workspaceId, input.workspaceId), inArray(employees.id, employeeIds)))
    : [];
  const employeeNameMap = new Map(employeeRows.map((e) => [e.id, e.name]));

  const upcomingOneOnOnes = oneOnOneRows
    .filter((m) => m.scheduledAt >= startIso && m.scheduledAt <= endIso && (m.status === "scheduled" || m.status === "rescheduled"))
    .map((m) => ({
      id: m.id,
      employeeId: m.employeeId,
      employeeName: employeeNameMap.get(m.employeeId) ?? m.employeeId,
      scheduledAt: m.scheduledAt,
      status: (m.status as "scheduled" | "rescheduled") ?? "scheduled",
      location: null,
    }));

  const overdueOneOnOnes = oneOnOneRows
    .filter((m) => m.status === "scheduled" && m.scheduledAt < startIso)
    .map((m) => ({
      id: m.id,
      employeeId: m.employeeId,
      employeeName: employeeNameMap.get(m.employeeId) ?? m.employeeId,
      scheduledAt: m.scheduledAt,
      daysOverdue: diffDays(new Date(m.scheduledAt), start),
    }));

  const goalsRows = employeeIds.length
    ? await db.select().from(developmentGoals).where(and(eq(developmentGoals.workspaceId, input.workspaceId), inArray(developmentGoals.employeeId, employeeIds)))
    : [];
  const goalsActive = goalsRows
    .filter((g) => g.status === "active")
    .map((g) => ({
      id: g.id,
      employeeId: g.employeeId,
      employeeName: employeeNameMap.get(g.employeeId) ?? g.employeeId,
      title: g.title,
      targetDate: g.dueDate ?? null,
      status: g.dueDate && new Date(g.dueDate) < new Date() ? "overdue" : "active",
    }));
  const goalsCompletedLast30 = goalsRows
    .filter((g) => g.status === "completed" && g.updatedAt && lt(shiftDate(-30), new Date(g.updatedAt)))
    .map((g) => ({
      id: g.id,
      employeeId: g.employeeId,
      employeeName: employeeNameMap.get(g.employeeId) ?? g.employeeId,
      title: g.title,
      completedAt: g.updatedAt ?? g.createdAt,
    }));

  const employeesWithoutGoals = employeeIds.filter((id) => !goalsRows.some((g) => g.employeeId === id && g.status === "active")).length;
  const withoutRecent1on1 = employeeIds.filter((id) => {
    const recent = oneOnOneRows.filter((o) => o.employeeId === id).some((o) => new Date(o.scheduledAt) >= shiftDate(-30));
    return !recent;
  }).length;

  // Feedback
  const activeSurveys = await db.select().from(feedbackSurveys).where(and(eq(feedbackSurveys.workspaceId, input.workspaceId), eq(feedbackSurveys.status, "active")));
  const responses =
    activeSurveys.length && employeeIds.length
      ? await db
          .select()
          .from(feedbackResponses)
          .where(and(eq(feedbackResponses.workspaceId, input.workspaceId), inArray(feedbackResponses.surveyId, activeSurveys.map((s) => s.id))))
      : [];
  const activeSurveysForTeam = activeSurveys.map((s) => {
    const teamResponses = responses.filter((r) => r.surveyId === s.id && employeeIds.includes(r.respondentId));
    const submitted = teamResponses.filter((r) => r.status === "submitted");
    const rate = teamResponses.length ? Number(((submitted.length / teamResponses.length) * 100).toFixed(1)) : null;
    return { surveyId: s.id, title: s.title, dueDate: s.endDate ?? null, responseRate: rate };
  });

  // Skill gaps (simple heuristic: take top gaps per employee profile)
  const employeesWithHighGap: { employeeId: string; employeeName: string; topSkillName: string; gap: number }[] = [];
  const gapAggregation = new Map<string, { skillId: string; skillName: string; totalGap: number; count: number; affected: number }>();
  for (const empId of employeeIds.slice(0, 20)) {
    const profile = await computeSkillProfileForEmployee({ workspaceId: input.workspaceId, employeeId: empId });
    const worst = profile.skills
      .filter((s) => s.gap !== null && (s.gap as number) < 0)
      .sort((a, b) => (a.gap ?? 0) - (b.gap ?? 0))[0];
    if (worst) {
      employeesWithHighGap.push({
        employeeId: empId,
        employeeName: employeeNameMap.get(empId) ?? empId,
        topSkillName: worst.skillName ?? worst.skillId,
        gap: worst.gap ?? 0,
      });
    }
    profile.skills.forEach((s) => {
      if (s.gap === null) return;
      const entry = gapAggregation.get(s.skillId) ?? { skillId: s.skillId, skillName: s.skillName ?? s.skillId, totalGap: 0, count: 0, affected: 0 };
      entry.totalGap += s.gap ?? 0;
      entry.count += 1;
      if ((s.gap ?? 0) < 0) entry.affected += 1;
      gapAggregation.set(s.skillId, entry);
    });
  }
  const criticalSkills = Array.from(gapAggregation.values())
    .map((s) => ({ ...s, avgGap: s.count ? s.totalGap / s.count : 0 }))
    .sort((a, b) => a.avgGap - b.avgGap)
    .slice(0, 5)
    .map((s) => ({ skillId: s.skillId, skillName: s.skillName, avgGap: s.avgGap, affectedEmployees: s.affected }));

  // Programs with team participants
  const programRows = await db.select().from(workspacePrograms).where(eq(workspacePrograms.workspaceId, input.workspaceId));
  const activeProgramsForTeam = programRows
    .filter((p) => (p.status === "active" || p.status === "planned") && includesAnyEmployee(p.targetEmployeeIds, employeeIds))
    .map((p) => ({
      id: p.id,
      name: p.name,
      participantsCount: countParticipants(p.targetEmployeeIds, employeeIds),
      hasRecentOutcomes: false,
    }));

  const snapshot: ManagerAgendaSnapshot = {
    managerId: input.managerId,
    workspaceId: input.workspaceId,
    period: { start: startIso, end: endIso },
    team: { teamSize: employeeIds.length, employeesWithoutRecent1on1: withoutRecent1on1, employeesWithoutGoals },
    upcomingOneOnOnes,
    overdueOneOnOnes,
    goals: { activeGoals: goalsActive, completedLast30d: goalsCompletedLast30 },
    skillGaps: { criticalSkills, employeesWithHighGap: employeesWithHighGap.slice(0, 5) },
    feedback: {
      activeSurveysForTeam,
      lastPulseForTeamSentAt: null,
      lastPulseSentiment: null,
    },
    programs: {
      activeProgramsForTeam,
      suggestedProgramsByGap: [],
    },
  };
  return snapshot;
}

function buildDayMap(from: Date, to: Date): Map<string, ManagerAgendaDay> {
  const map = new Map<string, ManagerAgendaDay>();
  for (let cursor = startOfDay(from); cursor.getTime() <= startOfDay(to).getTime(); cursor.setDate(cursor.getDate() + 1)) {
    const key = cursor.toISOString().slice(0, 10);
    map.set(key, { date: new Date(cursor), items: [] });
  }
  return map;
}

function pushAgendaItem(dayMap: Map<string, ManagerAgendaDay>, date: Date, item: ManagerAgendaItem) {
  const key = startOfDay(date).toISOString().slice(0, 10);
  const day = dayMap.get(key);
  if (!day) return;
  day.items.push(item);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isInRange(date: Date, from: Date, to: Date) {
  const value = startOfDay(date).getTime();
  return value >= startOfDay(from).getTime() && value <= startOfDay(to).getTime();
}

function priorityIndex(priority: ManagerAgendaPriority) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}

async function safeQuery<T>(loader: () => Promise<T>): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    if (error instanceof Error && /no such table/i.test(error.message ?? "")) {
      // для новых таблиц, которых может не быть в локальной БД без миграций
      return [] as T;
    }
    throw error;
  }
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function diffDays(a: Date, b: Date) {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function shiftDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function includesAnyEmployee(targetIdsJson: string | null, employeeIds: string[]) {
  const list = parseJsonArray(targetIdsJson);
  return list.some((id) => employeeIds.includes(id));
}

function countParticipants(targetIdsJson: string | null, employeeIds: string[]) {
  const list = parseJsonArray(targetIdsJson);
  return list.filter((id) => employeeIds.includes(id)).length;
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

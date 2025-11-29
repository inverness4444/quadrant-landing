import { addDays, endOfDay, isAfter, isBefore, startOfDay } from "date-fns";
import { and, eq, inArray, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  developmentGoalCheckins,
  developmentGoals,
  employees,
  employeeRoleAssignments,
  pilotRunParticipants,
  pilotRuns,
  quarterlyReports,
  roleProfiles,
  tracks,
  oneOnOnes,
  feedbackResponses,
  feedbackSurveys,
  users,
} from "@/drizzle/schema";
import { deriveQuarter, getQuarterDateRange } from "@/services/quarterlyReportService";

export type AgendaItemKind = "one_on_one" | "development_goal_review" | "pilot_review" | "skill_gap_review" | "quarterly_report_review" | "feedback" | "other";

export interface AgendaItem {
  id: string;
  workspaceId: string;
  managerId: string;
  kind: AgendaItemKind;
  date: string;
  title: string;
  description?: string;
  relatedEmployeeId?: string;
  relatedPilotId?: string;
  relatedReportId?: string;
  priority: 1 | 2 | 3;
  source: "development_goals" | "pilots" | "quarterly_reports" | "manual" | "system" | "one_on_ones" | "feedback";
  createdAt: string;
}

type ManagerContext = {
  teamId: string | null;
  employeeIds: string[];
};

function normalizeDate(value: string | Date): Date {
  return startOfDay(typeof value === "string" ? new Date(value) : value);
}

async function resolveManagerContext(workspaceId: string, managerId: string): Promise<ManagerContext> {
  const user = await db.query.users.findFirst({ where: eq(users.id, managerId) });
  const managerEmployee = await db.query.employees.findFirst({
    where: and(eq(employees.workspaceId, workspaceId), eq(employees.name, user?.name ?? "")),
  });
  if (managerEmployee?.primaryTrackId) {
    const teamEmployees = await db.select().from(employees).where(and(eq(employees.workspaceId, workspaceId), eq(employees.primaryTrackId, managerEmployee.primaryTrackId)));
    return { teamId: managerEmployee.primaryTrackId, employeeIds: teamEmployees.map((e) => e.id) };
  }
  // fallback: берем первую команду в воркспейсе
  const track = await db.query.tracks.findFirst({ where: eq(tracks.workspaceId, workspaceId) });
  if (!track) return { teamId: null, employeeIds: [] };
  const teamEmployees = await db.select().from(employees).where(and(eq(employees.workspaceId, workspaceId), eq(employees.primaryTrackId, track.id)));
  return { teamId: track.id, employeeIds: teamEmployees.map((e) => e.id) };
}

export async function buildAgendaForManager(input: { workspaceId: string; managerId: string; fromDate: string; toDate: string }): Promise<AgendaItem[]> {
  const from = normalizeDate(input.fromDate);
  const to = endOfDay(normalizeDate(input.toDate));
  const context = await resolveManagerContext(input.workspaceId, input.managerId);
  const items: AgendaItem[] = [];
  const nowIso = new Date().toISOString();

  // Development goals
  if (context.employeeIds.length) {
    const goals = await db
      .select()
      .from(developmentGoals)
      .where(and(eq(developmentGoals.workspaceId, input.workspaceId), inArray(developmentGoals.employeeId, context.employeeIds), eq(developmentGoals.status, "active")));
    const goalIds = goals.map((g) => g.id);
    const checkins = goalIds.length
      ? await db.select().from(developmentGoalCheckins).where(and(eq(developmentGoalCheckins.workspaceId, input.workspaceId), inArray(developmentGoalCheckins.goalId, goalIds)))
      : [];
    const latestCheckin = new Map<string, number>();
    checkins.forEach((c) => {
      const ts = Date.parse(c.createdAt ?? "");
      if (!Number.isNaN(ts)) {
        const prev = latestCheckin.get(c.goalId);
        if (!prev || ts > prev) latestCheckin.set(c.goalId, ts);
      }
    });
    const staleMs = 30 * 24 * 60 * 60 * 1000;
    goals.forEach((g) => {
      const due = g.dueDate ? new Date(g.dueDate) : null;
      const dueInRange = due && !isBefore(due, from) && !isAfter(due, addDays(to, 14));
      const overdue = due && due < from;
      const lastCheckin = latestCheckin.get(g.id);
      const isStale = !lastCheckin || Date.now() - lastCheckin > staleMs;
      if (dueInRange || overdue || isStale || g.priority === 1) {
        const date = due ?? from;
        items.push({
          id: `goal-${g.id}`,
          workspaceId: input.workspaceId,
          managerId: input.managerId,
          kind: "development_goal_review",
          date: date.toISOString(),
          title: `Пересмотреть план развития`,
          description: g.title ?? undefined,
          relatedEmployeeId: g.employeeId,
          priority: g.priority === 1 || overdue ? 1 : 2,
          source: "development_goals",
          createdAt: nowIso,
        });
      }
    });
  }

  // Pilots owned by manager
  const pilots = await db
    .select()
    .from(pilotRuns)
    .where(and(eq(pilotRuns.workspaceId, input.workspaceId), eq(pilotRuns.ownerUserId, input.managerId), eq(pilotRuns.status, "active")));
  const pilotIds = pilots.map((p) => p.id);
  const participantCounts =
    pilotIds.length > 0
      ? await db
          .select({
            pilotId: pilotRunParticipants.pilotRunId,
          })
          .from(pilotRunParticipants)
          .where(and(eq(pilotRunParticipants.workspaceId, input.workspaceId), inArray(pilotRunParticipants.pilotRunId, pilotIds)))
      : [];
  const countMap = new Map<string, number>();
  participantCounts.forEach((row) => countMap.set(row.pilotId, (countMap.get(row.pilotId) ?? 0) + 1));
  pilots.forEach((p) => {
    const endDate = p.endDate ? new Date(p.endDate) : null;
    if (endDate && !isAfter(endDate, addDays(to, 30))) {
      items.push({
        id: `pilot-${p.id}`,
        workspaceId: input.workspaceId,
        managerId: input.managerId,
        kind: "pilot_review",
        date: endDate.toISOString(),
        title: `Подготовить обзор по пилоту ${p.name}`,
        description: p.description ?? undefined,
        relatedPilotId: p.id,
        priority: 2,
        source: "pilots",
        createdAt: nowIso,
      });
    }
    const participants = countMap.get(p.id) ?? 0;
    if (participants === 0) {
      items.push({
        id: `pilot-participants-${p.id}`,
        workspaceId: input.workspaceId,
        managerId: input.managerId,
        kind: "pilot_review",
        date: from.toISOString(),
        title: `Добавить участников в пилот ${p.name}`,
        description: "Нет участников — выберите сотрудников.",
        relatedPilotId: p.id,
        priority: 2,
        source: "pilots",
        createdAt: nowIso,
      });
    }
  });

  // Quarterly report
  const current = deriveQuarter();
  const { end } = getQuarterDateRange(current.year, current.quarter);
  const report = await db.query.quarterlyReports.findFirst({
    where: and(eq(quarterlyReports.workspaceId, input.workspaceId), eq(quarterlyReports.year, current.year), eq(quarterlyReports.quarter, current.quarter)),
  });
  if (!report || !report.payload) {
    const reviewDate = addDays(end, -7);
    if (!isAfter(reviewDate, addDays(to, 14))) {
      items.push({
        id: `qr-${current.year}-${current.quarter}`,
        workspaceId: input.workspaceId,
        managerId: input.managerId,
        kind: "quarterly_report_review",
        date: reviewDate.toISOString(),
        title: `Подготовить квартальный отчёт Q${current.quarter} ${current.year}`,
        priority: 1,
        source: "quarterly_reports",
        createdAt: nowIso,
      });
    }
  } else {
    items.push({
      id: `qr-review-${report.id}`,
      workspaceId: input.workspaceId,
      managerId: input.managerId,
      kind: "quarterly_report_review",
      date: end.toISOString(),
      title: `Пересмотреть отчёт Q${current.quarter} ${current.year}`,
      relatedReportId: report.id,
      priority: 2,
      source: "quarterly_reports",
      createdAt: nowIso,
    });
  }

  // Skill gap review (эвристика по ролям с недостаточным покрытием)
  const roleRows = await db.select().from(roleProfiles).where(eq(roleProfiles.workspaceId, input.workspaceId));
  const roleEmployeeCounts = new Map<string, number>();
  const assignmentRows =
    roleRows.length > 0
      ? await db
          .select()
          .from(employeeRoleAssignments)
          .where(and(eq(employeeRoleAssignments.workspaceId, input.workspaceId), inArray(employeeRoleAssignments.roleProfileId, roleRows.map((r) => r.id))))
      : [];
  assignmentRows.forEach((row) => {
    roleEmployeeCounts.set(row.roleProfileId, (roleEmployeeCounts.get(row.roleProfileId) ?? 0) + 1);
  });
  roleRows
    .slice(0, 2)
    .forEach((role) => {
      items.push({
        id: `skill-gap-${role.id}`,
        workspaceId: input.workspaceId,
        managerId: input.managerId,
        kind: "skill_gap_review",
        date: from.toISOString(),
        title: `Обсудить skill gap в роли ${role.name}`,
        description: `Сотрудников: ${roleEmployeeCounts.get(role.id) ?? 0}`,
        priority: 3,
        source: "manual",
        createdAt: nowIso,
      });
    });

  // Feedback/pulse опросы
  const pendingFeedback = await db
    .select({ response: feedbackResponses, survey: feedbackSurveys })
    .from(feedbackResponses)
    .leftJoin(feedbackSurveys, eq(feedbackResponses.surveyId, feedbackSurveys.id))
    .where(and(eq(feedbackResponses.workspaceId, input.workspaceId), eq(feedbackResponses.respondentId, input.managerId), eq(feedbackResponses.status, "in_progress")));
  pendingFeedback.slice(0, 5).forEach((row) => {
    items.push({
      id: `feedback-${row.response.id}`,
      workspaceId: input.workspaceId,
      managerId: input.managerId,
      kind: "feedback",
      date: row.survey?.endDate ?? from.toISOString(),
      title: `Заполнить опрос: ${row.survey?.title ?? "Опрос"}`,
      relatedReportId: null,
      priority: 2,
      source: "feedback",
      createdAt: nowIso,
    });
  });

  // 1:1 встречи
  const oneOnOnesRows = await db
    .select()
    .from(oneOnOnes)
    .where(
      and(
        eq(oneOnOnes.workspaceId, input.workspaceId),
        eq(oneOnOnes.managerId, input.managerId),
        gte(oneOnOnes.scheduledAt, from.toISOString()),
        lte(oneOnOnes.scheduledAt, to.toISOString()),
      ),
    );
  for (const meeting of oneOnOnesRows) {
    items.push({
      id: `1on1-${meeting.id}`,
      workspaceId: input.workspaceId,
      managerId: input.managerId,
      kind: "one_on_one",
      date: meeting.scheduledAt,
      title: "1:1 с сотрудником",
      relatedEmployeeId: meeting.employeeId,
      priority: isAfter(new Date(), addDays(new Date(meeting.scheduledAt), -1)) ? 1 : 2,
      source: "manual",
      createdAt: nowIso,
    });
  }

  return items
    .filter((item) => {
      const d = new Date(item.date);
      return !isBefore(d, from) && !isAfter(d, addDays(to, 30));
    })
    .sort((a, b) => {
      const pa = a.priority;
      const pb = b.priority;
      if (pa !== pb) return pa - pb;
      return a.date.localeCompare(b.date);
    });
}

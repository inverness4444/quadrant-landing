import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  employees,
  meetingAgendaItems,
  meetingAgendas,
  pilotRunTeams,
  pilotRuns,
  pilotRunParticipants,
  feedbackResponses,
  feedbackSurveys,
  oneOnOnes,
  developmentGoalCheckins,
  developmentGoals,
  talentDecisions,
  tracks,
  users,
  type NotificationType,
  type NotificationEntityType,
} from "@/drizzle/schema";
import { notifications } from "@/drizzle/schema";
import { createNotification } from "@/services/notificationService";

export type ManagerHomeSummary = {
  managerId: string;
  managerName: string;
  teamId: string | null;
  teamName: string | null;
  headcount: number;
  pilotsTotal: number;
  pilotsActive: number;
  pilotsCompleted: number;
  employeesAtRisk: number;
  openDecisions: number;
  upcomingMeetingsCount: number;
};

export type ManagerHomeEmployeeCard = {
  employeeId: string;
  employeeName: string;
  roleTitle?: string | null;
  teamName?: string | null;
  isAtRisk: boolean;
  isHighPotential: boolean;
  inActivePilotsCount: number;
  openDecisionsCount: number;
};

export type ManagerHomeMeetingItem = {
  meetingId: string;
  title: string;
  date: Date;
  type: "one_to_one" | "team" | "pilot_review" | "other";
  employeeId?: string | null;
  employeeName?: string | null;
};

export type ManagerHomeActionItem = {
  id: string;
  kind:
    | "close_decision"
    | "schedule_one_to_one"
    | "review_pilot"
    | "pilot_add_participants"
    | "check_risk"
    | "update_skills"
    | "development_goal"
    | "quarterly_report_prepare"
    | "quarterly_report_review"
    | "one_on_one_today"
    | "feedback_due";
  priority: "high" | "medium" | "low";
  label: string;
  description?: string;
  employeeId?: string;
  decisionId?: string;
  pilotId?: string;
  goalId?: string;
  url?: string;
};

export async function getManagerHome(input: {
  workspaceId: string;
  userId: string;
}): Promise<{
  summary: ManagerHomeSummary;
  employees: ManagerHomeEmployeeCard[];
  upcomingMeetings: ManagerHomeMeetingItem[];
  actions: ManagerHomeActionItem[];
}> {
  const user = await db.query.users.findFirst({ where: eq(users.id, input.userId) });
  const managerName = user?.name ?? user?.email ?? "Менеджер";

  // Определяем команду менеджера: ищем сотрудника с тем же именем, берем его primaryTrackId.
  // TODO: поддержать несколько команд/явные роли менеджера и более надежную связь user->employee.
  const managerEmployee = await db.query.employees.findFirst({
    where: and(eq(employees.workspaceId, input.workspaceId), eq(employees.name, user?.name ?? "")),
  });
  const teamId = managerEmployee?.primaryTrackId ?? null;

  if (!teamId) {
    const summary: ManagerHomeSummary = {
      managerId: input.userId,
      managerName,
      teamId: null,
      teamName: null,
      headcount: 0,
      pilotsTotal: 0,
      pilotsActive: 0,
      pilotsCompleted: 0,
      employeesAtRisk: 0,
      openDecisions: 0,
      upcomingMeetingsCount: 0,
    };
    return { summary, employees: [], upcomingMeetings: [], actions: [] };
  }

  const team = await db.query.tracks.findFirst({ where: eq(tracks.id, teamId) });
  const teamName = team?.name ?? "Команда";

  const teamEmployees = await db.select().from(employees).where(and(eq(employees.workspaceId, input.workspaceId), eq(employees.primaryTrackId, teamId)));
  const headcount = teamEmployees.length;
  const employeeIds = teamEmployees.map((e) => e.id);

  // Pilots: берем пилоты, связанные с командой через pilot_run_teams.
  const pilotTeamRows = await db
    .select({ pilotRunId: pilotRunTeams.pilotRunId })
    .from(pilotRunTeams)
    .where(eq(pilotRunTeams.teamId, teamId));
  const pilotIds = pilotTeamRows.map((p) => p.pilotRunId);
  const pilots = pilotIds.length
    ? await db.select().from(pilotRuns).where(and(eq(pilotRuns.workspaceId, input.workspaceId), inArray(pilotRuns.id, pilotIds)))
    : [];
  const twelveWeeksAgo = new Date().getTime() - 12 * 7 * 24 * 60 * 60 * 1000;
  const pilotsTotal = pilots.length;
  const pilotsActive = pilots.filter((p) => p.status === "active" || p.status === "planned").length;
  const pilotsCompleted = pilots.filter((p) => p.status === "completed" && Date.parse(String(p.updatedAt ?? p.createdAt)) >= twelveWeeksAgo).length; // считаем завершённые за 12 недель

  // Decisions
  const decisions = employeeIds.length
    ? await db.select().from(talentDecisions).where(and(eq(talentDecisions.workspaceId, input.workspaceId), inArray(talentDecisions.employeeId, employeeIds)))
    : [];
  const openDecisions = decisions.filter((d) => d.status !== "implemented" && d.status !== "rejected").length;
  const employeesAtRisk = new Set(
    decisions.filter((d) => d.type === "monitor_risk" && d.status !== "rejected" && d.status !== "implemented").map((d) => d.employeeId),
  ).size;

  // Meetings: ближайшие 14 дней, где менеджер автор или есть связь с командой через agenda items.
  const now = new Date();
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const meetingRows = await db
    .select({
      meeting: meetingAgendas,
      itemTeamId: meetingAgendaItems.relatedTeamId,
      itemPilotId: meetingAgendaItems.relatedPilotRunId,
    })
    .from(meetingAgendas)
    .leftJoin(meetingAgendaItems, eq(meetingAgendas.id, meetingAgendaItems.agendaId))
    .where(and(eq(meetingAgendas.workspaceId, input.workspaceId), lt(meetingAgendas.scheduledAt, twoWeeks)));
  const meetingFiltered = meetingRows.filter((row) => {
    const sched = row.meeting.scheduledAt ? Date.parse(row.meeting.scheduledAt) : 0;
    if (!row.meeting.scheduledAt || sched < now.getTime()) return false;
    const isOwner = row.meeting.createdByUserId === input.userId;
    const isTeamRelated = row.itemTeamId === teamId;
    return isOwner || isTeamRelated;
  });
  const meetingMap = new Map<string, ManagerHomeMeetingItem>();
  meetingFiltered.forEach((row) => {
    const m = row.meeting;
    const type: ManagerHomeMeetingItem["type"] =
      m.type === "pilot_review" ? "pilot_review" : row.itemTeamId ? "team" : "other"; // TODO: детект one_to_one если появятся связи с сотрудником
    if (!meetingMap.has(m.id)) {
      meetingMap.set(m.id, {
        meetingId: m.id,
        title: m.title,
        date: new Date(m.scheduledAt!),
        type,
        employeeId: null,
        employeeName: null,
      });
    }
  });
  const upcomingMeetings = Array.from(meetingMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  // уведомления о встречах сегодня/завтра
  const soonMs = 2 * 24 * 60 * 60 * 1000;
  const nowMs = now.getTime();
  for (const meeting of upcomingMeetings) {
    const diff = meeting.date.getTime() - nowMs;
    if (diff >= 0 && diff <= soonMs) {
      void createNotificationIfAbsent({
        workspaceId: input.workspaceId,
        userId: input.userId,
        type: "meeting_upcoming",
        title: `Встреча: ${meeting.title}`,
        body: `Запланирована на ${meeting.date.toLocaleString("ru-RU")}`,
        entityType: "meeting_agenda",
        entityId: meeting.meetingId,
        url: `/app/meetings/${meeting.meetingId}`,
        priority: 2,
      });
    }
  }

  const summary: ManagerHomeSummary = {
    managerId: input.userId,
    managerName,
    teamId,
    teamName,
    headcount,
    pilotsTotal,
    pilotsActive,
    pilotsCompleted,
    employeesAtRisk,
    openDecisions,
    upcomingMeetingsCount: upcomingMeetings.length,
  };

  // Employees cards
  const activePilotIds = new Set(pilots.filter((p) => p.status === "active" || p.status === "planned").map((p) => p.id));
  const employeesCards: ManagerHomeEmployeeCard[] = teamEmployees.map((emp) => {
    const empDecisions = decisions.filter((d) => d.employeeId === emp.id);
    const isAtRisk = empDecisions.some((d) => d.type === "monitor_risk" && d.status !== "rejected" && d.status !== "implemented");
    const isHighPotential = empDecisions.some((d) => (d.type === "promote" || d.type === "role_change") && d.status !== "rejected");
    const inActivePilotsCount = activePilotIds.size; // TODO: считать индивидуальное участие, сейчас по команде
    const openDecisionsCount = empDecisions.filter((d) => d.status !== "implemented" && d.status !== "rejected").length;
    return {
      employeeId: emp.id,
      employeeName: emp.name,
      roleTitle: emp.position,
      teamName,
      isAtRisk,
      isHighPotential,
      inActivePilotsCount,
      openDecisionsCount,
    };
  });

  // Actions
  const actions: ManagerHomeActionItem[] = [];

  // schedule_one_to_one for risk employees (мы не знаем 1:1 => считаем, что ближайшей нет)
  employeesCards
    .filter((e) => e.isAtRisk)
    .forEach((emp) => {
      actions.push({
        id: `1on1-${emp.employeeId}`,
        kind: "schedule_one_to_one",
        priority: "high",
        label: `Назначить 1:1 с ${emp.employeeName}`,
        description: "Сотрудник в зоне риска, запланируйте разговор на этой неделе.",
        employeeId: emp.employeeId,
      });
    });

  // close_decision for open decisions
  decisions
    .filter((d) => d.status !== "implemented" && d.status !== "rejected")
    .forEach((d) => {
      actions.push({
        id: `dec-${d.id}`,
        kind: "close_decision",
        priority: "high",
        label: `Закрыть решение по ${d.title ?? "сотруднику"}`,
        description: `Открытое решение в статусе ${d.status}`,
        employeeId: d.employeeId,
        decisionId: d.id,
      });
    });

  // review_pilot for долго активных пилотов ( >30 дней )
  const thirtyDaysAgo = new Date().getTime() - 28 * 24 * 60 * 60 * 1000;
  pilots
    .filter((p) => (p.status === "active" || p.status === "planned") && Date.parse(String(p.createdAt)) < thirtyDaysAgo)
    .forEach((p) => {
      actions.push({
        id: `pilot-${p.id}`,
        kind: "review_pilot",
        priority: "medium",
        label: `Провести ревью пилота ${p.name}`,
        description: "Пилот активен больше 4 недель, стоит оценить прогресс.",
        pilotId: p.id,
        url: `/app/pilots/${p.id}`,
      });
    });

  // check_risk / update_skills for risk/high potential
  employeesCards.forEach((emp) => {
    if (emp.isAtRisk) {
      actions.push({
        id: `risk-${emp.employeeId}`,
        kind: "check_risk",
        priority: "high",
        label: `Проверить риски по ${emp.employeeName}`,
        description: "Подтвердите план по снижению рисков удержания.",
        employeeId: emp.employeeId,
      });
    } else if (emp.isHighPotential) {
      actions.push({
        id: `skills-${emp.employeeId}`,
        kind: "update_skills",
        priority: "medium",
        label: `Уточнить план роста для ${emp.employeeName}`,
        description: "Высокий потенциал — обновите цели и навыки.",
        employeeId: emp.employeeId,
      });
    }
  });

  // development goals actions
  actions.push(...(await collectDevelopmentGoalActions({ workspaceId: input.workspaceId, employeeIds, employees: employeesCards, managerUserId: input.userId })));
  actions.push(...(await collectPilotActions({ workspaceId: input.workspaceId, managerUserId: input.userId })));
  actions.push(...(await collectQuarterlyReportActions({ workspaceId: input.workspaceId, managerUserId: input.userId })));
  actions.push(...(await collectOneOnOneActions({ workspaceId: input.workspaceId, managerUserId: input.userId })));
  actions.push(...(await collectFeedbackActions({ workspaceId: input.workspaceId, managerUserId: input.userId })));

  const sortedActions = actions.sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority));

  return { summary, employees: employeesCards, upcomingMeetings, actions: sortedActions };
}

function priorityWeight(p: ManagerHomeActionItem["priority"]) {
  if (p === "high") return 0;
  if (p === "medium") return 1;
  return 2;
}

async function collectDevelopmentGoalActions(input: {
  workspaceId: string;
  employeeIds: string[];
  employees: ManagerHomeEmployeeCard[];
  managerUserId: string;
}): Promise<ManagerHomeActionItem[]> {
  if (input.employeeIds.length === 0) return [];
  const goals = await db
    .select()
    .from(developmentGoals)
    .where(and(eq(developmentGoals.workspaceId, input.workspaceId), inArray(developmentGoals.employeeId, input.employeeIds), eq(developmentGoals.status, "active")));
  if (goals.length === 0) return [];
  const goalIds = goals.map((g) => g.id);
  const checkins = await db
    .select({
      goalId: developmentGoalCheckins.goalId,
      createdAt: developmentGoalCheckins.createdAt,
    })
    .from(developmentGoalCheckins)
    .where(inArray(developmentGoalCheckins.goalId, goalIds))
    .orderBy(developmentGoalCheckins.goalId, developmentGoalCheckins.createdAt);
  const latestCheckin = new Map<string, string>();
  checkins.forEach((c) => {
    latestCheckin.set(c.goalId, c.createdAt);
  });
  const now = new Date();
  const soonMs = 14 * 24 * 60 * 60 * 1000;
  const staleMs = 30 * 24 * 60 * 60 * 1000;
  const actions: ManagerHomeActionItem[] = [];
  goals.forEach((goal) => {
    const emp = input.employees.find((e) => e.employeeId === goal.employeeId);
    const due = goal.dueDate ? Date.parse(goal.dueDate) : null;
    const lastCheckin = latestCheckin.get(goal.id);
    const lastCheckinMs = lastCheckin ? Date.parse(lastCheckin) : null;
    const isDueSoon = due !== null && due - now.getTime() <= soonMs;
    const isOverdue = due !== null && due < now.getTime();
    const isStale = !due && (!lastCheckinMs || now.getTime() - lastCheckinMs > staleMs);
    const needsAttention = isDueSoon || isOverdue || isStale;
    if (!needsAttention) return;
    const priority: ManagerHomeActionItem["priority"] = goal.priority === 1 ? "high" : goal.priority === 3 ? "low" : "medium";
    actions.push({
      id: `devgoal-${goal.id}`,
      kind: "development_goal",
      priority,
      label: `Обсудить план развития: ${emp?.employeeName ?? "Сотрудник"} — ${goal.title}`,
      description: goal.dueDate ? `Дедлайн: ${new Date(goal.dueDate).toLocaleDateString("ru-RU")}` : "Нет дедлайна, давно без обновлений",
      employeeId: goal.employeeId,
      goalId: goal.id,
      url: `/app/skills/employee/${goal.employeeId}`,
    });
    const type: NotificationType = isOverdue || isDueSoon ? "development_goal_due" : "development_goal_stale";
    void createNotificationIfAbsent({
      workspaceId: input.workspaceId,
      userId: input.managerUserId,
      type,
      title: isOverdue ? `Просроченная цель: ${goal.title}` : `Давно без прогресса: ${goal.title}`,
      body: `${emp?.employeeName ?? "Сотрудник"} · приоритет ${goal.priority}`,
      entityType: "goal",
      entityId: goal.id,
      priority: goal.priority ?? 2,
      url: `/app/skills/employee/${goal.employeeId}`,
    });
  });
  return actions;
}

async function collectPilotActions(input: { workspaceId: string; managerUserId: string }): Promise<ManagerHomeActionItem[]> {
  const pilots = await db
    .select()
    .from(pilotRuns)
    .where(and(eq(pilotRuns.workspaceId, input.workspaceId), eq(pilotRuns.ownerUserId, input.managerUserId)));
  if (pilots.length === 0) return [];
  const pilotIds = pilots.map((p) => p.id);
  const participantCounts = pilotIds.length
    ? await db
        .select({
          pilotId: pilotRunParticipants.pilotRunId,
          count: sql<number>`count(*)`,
        })
        .from(pilotRunParticipants)
        .where(and(eq(pilotRunParticipants.workspaceId, input.workspaceId), inArray(pilotRunParticipants.pilotRunId, pilotIds)))
        .groupBy(pilotRunParticipants.pilotRunId)
    : [];
  const participantMap = new Map<string, number>();
  participantCounts.forEach((row) => participantMap.set(row.pilotId, Number(row.count ?? 0)));
  const now = new Date();
  const soonMs = 7 * 24 * 60 * 60 * 1000;

  const actions: ManagerHomeActionItem[] = [];
  pilots.forEach((pilot) => {
    const url = `/app/pilots/${pilot.id}`;
    const participantCount = participantMap.get(pilot.id) ?? 0;

    if ((pilot.status === "active" || pilot.status === "planned") && pilot.endDate) {
      const diff = Date.parse(pilot.endDate) - now.getTime();
      if (!Number.isNaN(diff) && diff <= soonMs) {
        actions.push({
          id: `pilot-review-${pilot.id}`,
          kind: "review_pilot",
          priority: diff <= 3 * 24 * 60 * 60 * 1000 ? "high" : "medium",
          label: `Подготовить обзор пилота ${pilot.name}`,
          description: pilot.endDate ? `Завершается ${new Date(pilot.endDate).toLocaleDateString("ru-RU")}` : undefined,
          pilotId: pilot.id,
          url,
        });
        void createNotificationIfAbsent({
          workspaceId: input.workspaceId,
          userId: input.managerUserId,
          type: "pilot_ending_soon",
          title: `Скоро завершится пилот ${pilot.name}`,
          body: pilot.endDate ? `Дедлайн: ${new Date(pilot.endDate).toLocaleDateString("ru-RU")}` : pilot.name,
          entityType: "pilot_run",
          entityId: pilot.id,
          url,
          priority: 1,
        });
      }
    }

    if (participantCount === 0 && (pilot.status === "active" || pilot.status === "draft")) {
      actions.push({
        id: `pilot-add-${pilot.id}`,
        kind: "pilot_add_participants",
        priority: "medium",
        label: `Добавить участников в пилот ${pilot.name}`,
        description: "Пока нет участников — выберите сотрудников.",
        pilotId: pilot.id,
        url: `${url}?focus=participants`,
      });
    }
  });

  return actions;
}

async function collectQuarterlyReportActions(input: { workspaceId: string; managerUserId: string }): Promise<ManagerHomeActionItem[]> {
  const now = new Date();
  const current = deriveQuarter(now);
  const { end } = getQuarterDateRange(current.year, current.quarter);
  const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
  const untilEnd = end.getTime() - now.getTime();
  const existing = await db.query.quarterlyReports.findFirst({
    where: and(eq(quarterlyReports.workspaceId, input.workspaceId), eq(quarterlyReports.year, current.year), eq(quarterlyReports.quarter, current.quarter)),
  });
  const actions: ManagerHomeActionItem[] = [];
  if (!existing && untilEnd <= twoWeeksMs) {
    actions.push({
      id: `quarterly-prepare-${current.year}-${current.quarter}`,
      kind: "quarterly_report_prepare",
      priority: "high",
      label: `Подготовить квартальный отчёт за Q${current.quarter} ${current.year}`,
      url: `/app/reports/quarterly?year=${current.year}&quarter=${current.quarter}`,
    });
  } else if (existing) {
    actions.push({
      id: `quarterly-review-${existing.id}`,
      kind: "quarterly_report_review",
      priority: "medium",
      label: `Проверить квартальный отчёт Q${current.quarter} ${current.year}`,
      url: `/app/reports/quarterly/${existing.id}`,
    });
  }
  return actions;
}

async function collectOneOnOneActions(input: { workspaceId: string; managerUserId: string }): Promise<ManagerHomeActionItem[]> {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const rows = await db
    .select()
    .from(oneOnOnes)
    .where(and(eq(oneOnOnes.workspaceId, input.workspaceId), eq(oneOnOnes.managerId, input.managerUserId), lt(oneOnOnes.scheduledAt, tomorrow)));
  if (!rows.length) return [];
  return rows.map((row) => ({
    id: `1on1-${row.id}`,
    kind: "one_on_one_today",
    priority: "high",
    label: "1:1 сегодня",
    url: `/app/one-on-ones/${row.id}`,
    employeeId: row.employeeId,
  }));
}

async function collectFeedbackActions(input: { workspaceId: string; managerUserId: string }): Promise<ManagerHomeActionItem[]> {
  const rows = await db
    .select({ response: feedbackResponses, survey: feedbackSurveys })
    .from(feedbackResponses)
    .leftJoin(feedbackSurveys, eq(feedbackResponses.surveyId, feedbackSurveys.id))
    .where(and(eq(feedbackResponses.workspaceId, input.workspaceId), eq(feedbackResponses.respondentId, input.managerUserId), eq(feedbackResponses.status, "in_progress")));
  return rows.slice(0, 5).map((row) => ({
    id: `fb-${row.response.id}`,
    kind: "feedback_due",
    priority: "medium",
    label: `Заполнить опрос: ${row.survey?.title ?? "Опрос"}`,
    url: `/app/feedback/respond/${row.response.id}`,
  }));
}

async function createNotificationIfAbsent(input: {
  workspaceId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  url?: string;
  priority?: number;
}) {
  const conditions = [
    eq(notifications.workspaceId, input.workspaceId),
    eq(notifications.userId, input.userId),
    eq(notifications.type, input.type),
    eq(notifications.isRead, false),
  ];
  if (input.entityId) {
    conditions.push(eq(notifications.entityId, input.entityId));
  }
  const exists = await db.select({ id: notifications.id }).from(notifications).where(and(...conditions)).limit(1);
  if (exists.length > 0) return;
  await createNotification(input);
}

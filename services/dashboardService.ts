import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  employees,
  meetingAgendas,
  notifications,
  pilotRunSteps,
  pilotRunTeams,
  pilotRuns,
  reminderRules,
  reports,
  tracks,
  talentDecisions,
  users,
} from "@/drizzle/schema";
import type {
  DashboardActionItem,
  DashboardData,
  DashboardPilotAtRisk,
  DashboardSummary,
  DashboardUpcomingMeeting,
} from "@/services/types/dashboard";

// MVP aggregation: relies on existing data; TODO: optimise joins / replace with dedicated views if needed.
export async function getDashboardData(input: { workspaceId: string; userId: string }): Promise<DashboardData> {
  const [employeeCountRow, teamCountRow, activePilotsRows, meetingRows, reminderRulesRows, staleReportsRows, unreadRows, openDecisionsRows] =
    await Promise.all([
      db.select({ count: employees.id }).from(employees).where(eq(employees.workspaceId, input.workspaceId)),
      db.select({ count: tracks.id }).from(tracks).where(eq(tracks.workspaceId, input.workspaceId)),
      db.select().from(pilotRuns).where(and(eq(pilotRuns.workspaceId, input.workspaceId), inArray(pilotRuns.status, ["active", "planned" as never]))),
      db.select().from(meetingAgendas).where(eq(meetingAgendas.workspaceId, input.workspaceId)),
      db.select().from(reminderRules).where(eq(reminderRules.workspaceId, input.workspaceId)),
      db.select().from(reports).where(eq(reports.workspaceId, input.workspaceId)),
      db
        .select({ id: notifications.id })
        .from(notifications)
        .where(and(eq(notifications.workspaceId, input.workspaceId), eq(notifications.userId, input.userId), eq(notifications.isRead, false))),
      db
        .select({ id: talentDecisions.id })
        .from(talentDecisions)
        .where(and(eq(talentDecisions.workspaceId, input.workspaceId), inArray(talentDecisions.status, ["proposed", "approved"]))),
    ]);

  const totalEmployees = Number(employeeCountRow[0]?.count ?? 0);
  const totalTeams = Number(teamCountRow[0]?.count ?? 0);
  const activePilots = activePilotsRows.length;

  const staleRule = reminderRulesRows.find((rule) => rule.key === "reports");
  const staleDays = staleRule?.staleDays ?? 30;
  const staleThreshold = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString();
  const staleReportsCount = staleReportsRows.filter(
    (report) => (report.status === "draft" || report.status === "finalized") && report.updatedAt < staleThreshold,
  ).length;

  const unreadNotificationsCount = unreadRows.length;
  const openDecisionsCount = openDecisionsRows.length;

  const pilotsAtRiskList = await loadPilotsAtRisk(input.workspaceId);
  const upcomingMeetingsList = computeUpcomingMeetings(meetingRows, activePilotsRows);

  const summary: DashboardSummary = {
    workspaceId: input.workspaceId,
    totalEmployees,
    totalTeams,
    activePilots,
    pilotsAtRisk: pilotsAtRiskList.length,
    upcomingMeetingsCount: upcomingMeetingsList.length,
    staleReportsCount,
    unreadNotificationsCount,
    openDecisionsCount,
  };

  const actionItems: DashboardActionItem[] = await loadActionItems(input.workspaceId, input.userId);

  return {
    summary,
    pilotsAtRisk: pilotsAtRiskList.slice(0, 5),
    upcomingMeetings: upcomingMeetingsList.slice(0, 5),
    actionItems: actionItems.slice(0, 10),
  };
}

async function loadPilotsAtRisk(workspaceId: string): Promise<DashboardPilotAtRisk[]> {
  const todayIso = new Date().toISOString();
  const steps = await db
    .select({
      pilotRunId: pilotRunSteps.pilotRunId,
      status: pilotRunSteps.status,
      dueDate: pilotRunSteps.dueDate,
    })
    .from(pilotRunSteps)
    .innerJoin(pilotRuns, eq(pilotRuns.id, pilotRunSteps.pilotRunId))
    .where(eq(pilotRuns.workspaceId, workspaceId));

  const overdueByPilot = new Map<string, number>();
  for (const step of steps) {
    if (!step.dueDate) continue;
    if ((step.status === "pending" || step.status === "in_progress") && step.dueDate < todayIso) {
      overdueByPilot.set(step.pilotRunId, (overdueByPilot.get(step.pilotRunId) ?? 0) + 1);
    }
  }

  const pilotIds = [...overdueByPilot.keys()];
  if (pilotIds.length === 0) return [];
  const pilots = await db.select().from(pilotRuns).where(inArray(pilotRuns.id, pilotIds));
  const ownerIds = pilots.map((p) => p.ownerUserId);
  const owners = ownerIds.length ? await db.select().from(users).where(inArray(users.id, ownerIds)) : [];
  const ownerMap = new Map(owners.map((u) => [u.id, u.name ?? u.email]));

  const pilotTeamsRows =
    pilotIds.length > 0
      ? await db
          .select({ pilotRunId: pilotRunTeams.pilotRunId, teamName: tracks.name })
          .from(pilotRunTeams)
          .innerJoin(tracks, eq(tracks.id, pilotRunTeams.teamId))
          .where(inArray(pilotRunTeams.pilotRunId, pilotIds))
      : [];
  const teamMap = new Map<string, string>();
  pilotTeamsRows.forEach((row) => teamMap.set(row.pilotRunId, row.teamName));

  return pilots
    .map<DashboardPilotAtRisk>((pilot) => ({
      pilotRunId: pilot.id,
      name: pilot.name,
      ownerName: ownerMap.get(pilot.ownerUserId) ?? null,
      teamName: teamMap.get(pilot.id) ?? null,
      status: pilot.status,
      overdueSteps: overdueByPilot.get(pilot.id) ?? 0,
      nextMeetingAt: null, // TODO: связать пилот с agenda напрямую
    }))
    .filter((entry) => entry.overdueSteps > 0)
    .sort((a, b) => b.overdueSteps - a.overdueSteps);
}

function computeUpcomingMeetings(
  meetings: typeof meetingAgendas.$inferSelect[],
  pilots: typeof pilotRuns.$inferSelect[],
): DashboardUpcomingMeeting[] {
  const now = Date.now();
  const max = now + 7 * 24 * 60 * 60 * 1000;
  const pilotMap = new Map(pilots.map((p) => [p.id, p.name]));
  return meetings
    .filter((meeting) => meeting.scheduledAt)
    .map((meeting) => ({
      agendaId: meeting.id,
      title: meeting.title,
      scheduledAt: new Date(meeting.scheduledAt!),
      ownerName: null,
      relatedPilotRunId: null,
      relatedPilotName: null,
    }))
    .filter((m) => {
      const t = m.scheduledAt.getTime();
      return t >= now && t <= max;
    })
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    .map((meeting) => ({
      ...meeting,
      relatedPilotName: meeting.relatedPilotRunId ? pilotMap.get(meeting.relatedPilotRunId) ?? null : null,
    }));
}

async function loadActionItems(workspaceId: string, userId: string): Promise<DashboardActionItem[]> {
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.workspaceId, workspaceId), eq(notifications.userId, userId), eq(notifications.isRead, false)))
    .orderBy(desc(notifications.createdAt))
    .limit(20);
  const allowedTypes = new Set(["pilot_step_due", "meeting_upcoming", "report_stale", "system"]);
  return rows
    .filter((row) => allowedTypes.has(row.type))
    .map((row) => ({
      id: row.id,
      type: row.type as DashboardActionItem["type"],
      title: row.title,
      body: row.body,
      url: row.url ?? undefined,
      createdAt: new Date(row.createdAt),
    }));
}

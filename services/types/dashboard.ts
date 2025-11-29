export type DashboardSummary = {
  workspaceId: string;
  totalEmployees: number;
  totalTeams: number;
  activePilots: number;
  pilotsAtRisk: number;
  upcomingMeetingsCount: number;
  staleReportsCount: number;
  unreadNotificationsCount: number;
  openDecisionsCount?: number;
};

export type DashboardPilotAtRisk = {
  pilotRunId: string;
  name: string;
  ownerName: string | null;
  teamName: string | null;
  status: string;
  overdueSteps: number;
  nextMeetingAt?: Date | null;
};

export type DashboardUpcomingMeeting = {
  agendaId: string;
  title: string;
  scheduledAt: Date;
  ownerName: string | null;
  relatedPilotRunId?: string | null;
  relatedPilotName?: string | null;
};

export type DashboardActionItem = {
  id: string;
  type: "pilot_step_due" | "meeting_upcoming" | "report_stale" | "system";
  title: string;
  body: string;
  url?: string;
  createdAt: Date;
};

export type DashboardData = {
  summary: DashboardSummary;
  pilotsAtRisk: DashboardPilotAtRisk[];
  upcomingMeetings: DashboardUpcomingMeeting[];
  actionItems: DashboardActionItem[];
};

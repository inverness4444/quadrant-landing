import { getCompanyHealthSnapshot } from "@/services/analyticsService";

export type ExecutiveReportSnapshot = {
  periodStart: string;
  periodEnd: string;
  headcount: number;
  goalsSummary: { active: number; completed: number; overdue: number };
  skillGapsSummary: { criticalSkillsCount: number; employeesWithHighGap: number };
  programsSummary: { activePrograms: number; participants: number; completedProgramsLastPeriod: number };
  oneOnOnesSummary: { planned: number; completed: number; overdue: number; coverageRate: number | null };
  surveysSummary: { activeSurveys: number; avgResponseRate: number | null; lastPulseSentiment: "positive" | "neutral" | "negative" | null };
  quarterlyReportsSummary: { reportsCount: number; lastReportTitle: string | null; lastReportPeriod: string | null };
};

export async function buildExecutiveReportSnapshot(input: { workspaceId: string; periodStart: Date; periodEnd: Date }): Promise<ExecutiveReportSnapshot> {
  const company = await getCompanyHealthSnapshot(input.workspaceId);
  return {
    periodStart: input.periodStart.toISOString(),
    periodEnd: input.periodEnd.toISOString(),
    headcount: company.headcount.totalEmployees,
    goalsSummary: {
      active: company.goals.activeGoals,
      completed: company.goals.completedLast30d,
      overdue: company.goals.overdueGoals,
    },
    skillGapsSummary: {
      criticalSkillsCount: company.skillGap.rolesTracked,
      employeesWithHighGap: 0,
    },
    programsSummary: {
      activePrograms: company.programs.active,
      participants: 0,
      completedProgramsLastPeriod: company.programs.completed,
    },
    oneOnOnesSummary: {
      planned: company.oneOnOnes.last30dCount,
      completed: 0,
      overdue: company.oneOnOnes.employeesWithoutRecent1on1,
      coverageRate: null,
    },
    surveysSummary: {
      activeSurveys: company.feedback.activeSurveys,
      avgResponseRate: company.feedback.avgResponseRate,
      lastPulseSentiment: company.feedback.lastPulseSentiment,
    },
    quarterlyReportsSummary: {
      reportsCount: company.reports.lastQuarterReportId ? 1 : 0,
      lastReportTitle: company.reports.lastQuarterLabel,
      lastReportPeriod: company.reports.lastQuarterLabel,
    },
  };
}

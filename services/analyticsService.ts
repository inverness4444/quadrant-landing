import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  employees,
  employeeSkillRatings,
  roleProfiles,
  employeeRoleAssignments,
  skills,
  developmentGoals,
  pilotRuns,
  pilotRunParticipants,
  feedbackSurveys,
  feedbackResponses,
  feedbackAnswers,
  quarterlyReports,
  programOutcomes,
  workspacePrograms,
  pilotOutcomes,
} from "@/drizzle/schema";
import { getEmployeeSkillLevels } from "@/services/skillGapService";

type WorkspaceParams = { workspaceId: string; since?: string | null; until?: string | null } | string;

export async function getWorkspaceOverview(input: WorkspaceParams) {
  const { workspaceId, since, until } = normalizeInput(input);
  const sinceDate = since ? new Date(since) : null;
  const untilDate = until ? new Date(until) : null;
  const employeesRows = await db.select().from(employees).where(eq(employees.workspaceId, workspaceId));
  const headcount = {
    totalEmployees: employeesRows.length,
    activeEmployees: employeesRows.length, // нет поля isActive
    newHiresLastPeriod: 0,
    leaversLastPeriod: 0,
  };

  const ratings = await db.select().from(employeeSkillRatings).where(eq(employeeSkillRatings.workspaceId, workspaceId));
  const avgSkillLevel = ratings.length ? ratings.reduce((a, b) => a + (b.level ?? 0), 0) / ratings.length : 0;
  const skillsCount = await db.select().from(skills).where(eq(skills.workspaceId, workspaceId));
  const skillsInfo = { trackedSkills: skillsCount.length, avgSkillLevel: Number(avgSkillLevel.toFixed(2)), highRiskEmployees: 0 };

  const goals = await db.select().from(developmentGoals).where(eq(developmentGoals.workspaceId, workspaceId));
  const completedLastPeriod = goals.filter((g) => g.status === "completed" && inRange(g.updatedAt ?? g.createdAt, sinceDate, untilDate)).length;
  const overdueHighPriorityGoals = goals.filter((g) => g.status === "active" && g.priority === 1 && g.dueDate && new Date(g.dueDate) < new Date()).length;
  const development = {
    activeGoals: goals.filter((g) => g.status === "active").length,
    completedGoalsLastPeriod: completedLastPeriod,
    overdueHighPriorityGoals,
  };

  const pilotsRows = await db.select().from(pilotRuns).where(eq(pilotRuns.workspaceId, workspaceId));
  const pilotParticipants = await db.select().from(pilotRunParticipants).where(eq(pilotRunParticipants.workspaceId, workspaceId));
  const completedPilotsLastPeriod = pilotsRows.filter((p) => p.status === "completed" && inRange(p.updatedAt ?? p.createdAt, sinceDate, untilDate)).length;
  const participantsLastPeriod = pilotParticipants.filter((p) => inRange(p.createdAt, sinceDate, untilDate)).length;
  const pilotsInfo = {
    activePilots: pilotsRows.filter((p) => p.status === "active").length,
    completedPilotsLastPeriod,
    participantsLastPeriod,
  };

  const surveys = await db.select().from(feedbackSurveys).where(eq(feedbackSurveys.workspaceId, workspaceId));
  const responses = surveys.length
    ? await db.select().from(feedbackResponses).where(and(eq(feedbackResponses.workspaceId, workspaceId), inArray(feedbackResponses.surveyId, surveys.map((s) => s.id))))
    : [];
  const pulseSurveys = surveys.filter((s) => s.type === "pulse");
  const pulseResponses = responses.filter((r) => pulseSurveys.some((s) => s.id === r.surveyId));
  const pulseSubmitted = pulseResponses.filter((r) => r.status === "submitted");
  const pulseAnswerRows = pulseSubmitted.length
    ? await db.select().from(feedbackAnswers).where(and(eq(feedbackAnswers.workspaceId, input.workspaceId), inArray(feedbackAnswers.responseId, pulseSubmitted.map((r) => r.id))))
    : [];
  const pulseScaleValues = pulseAnswerRows.map((a) => a.scaleValue).filter((v) => v !== null && v !== undefined) as number[];
  const avgPulseScore = pulseScaleValues.length ? Number((pulseScaleValues.reduce((a, b) => a + b, 0) / pulseScaleValues.length).toFixed(2)) : null;
  const feedback = {
    surveysRunLastPeriod: surveys.filter((s) => inRange(s.createdAt, sinceDate, untilDate)).length,
    avgPulseScore,
    responseRate: pulseResponses.length ? Number(((pulseSubmitted.length / pulseResponses.length) * 100).toFixed(2)) : null,
  };

  const legacy = {
    employeesCount: headcount.totalEmployees,
    skillsCount: skillsInfo.trackedSkills,
    pilotsCount: pilotsRows.length,
    tracksCount: 0,
    integrationsCount: 0,
    artifactsCount: 0,
    plan: {
      currentEmployeesCount: headcount.totalEmployees,
      currentIntegrationsCount: 0,
    },
  };

  const outcomes = await getOutcomesSummary(workspaceId);
  const skillGap = await getSkillGapOverview(workspaceId);

  return { headcount, skills: skillsInfo, development, pilots: pilotsInfo, feedback, outcomes, skillGap, ...legacy };
}

export async function getSkillsOverview(input: { workspaceId: string }) {
  const roles = await db.select().from(roleProfiles).where(eq(roleProfiles.workspaceId, input.workspaceId));
  const assignments = await db.select().from(employeeRoleAssignments).where(eq(employeeRoleAssignments.workspaceId, input.workspaceId));
  const ratings = await db.select().from(employeeSkillRatings).where(eq(employeeSkillRatings.workspaceId, input.workspaceId));
  const skillList = await db.select().from(skills).where(eq(skills.workspaceId, input.workspaceId));

  const roleData = roles.map((role) => {
    const employeesWithRole = assignments.filter((a) => a.roleProfileId === role.id).map((a) => a.employeeId);
    const roleRatings = ratings.filter((r) => employeesWithRole.includes(r.employeeId));
    const avg = roleRatings.length ? roleRatings.reduce((a, b) => a + b.level, 0) / roleRatings.length : 0;
    const bySkill = new Map<string, number[]>();
    roleRatings.forEach((r) => {
      if (!bySkill.has(r.skillCode)) bySkill.set(r.skillCode, []);
      bySkill.get(r.skillCode)!.push(r.level);
    });
    const topWeakSkills = Array.from(bySkill.entries())
      .map(([code, levels]) => ({
        skillCode: code,
        skillName: skillList.find((s) => s.name === code || s.id === code)?.name ?? code,
        avgLevel: levels.reduce((a, b) => a + b, 0) / levels.length,
      }))
      .sort((a, b) => a.avgLevel - b.avgLevel)
      .slice(0, 5);
    return {
      roleId: role.id,
      roleName: role.name,
      employeesCount: employeesWithRole.length,
      avgSkillLevel: Number(avg.toFixed(2)),
      highRiskEmployees: 0,
      topWeakSkills,
    };
  });

  const globalMap = new Map<string, number[]>();
  ratings.forEach((r) => {
    if (!globalMap.has(r.skillCode)) globalMap.set(r.skillCode, []);
    globalMap.get(r.skillCode)!.push(r.level);
  });
  const globalTopWeakSkills = Array.from(globalMap.entries())
    .map(([code, levels]) => ({
      skillCode: code,
      skillName: skillList.find((s) => s.name === code || s.id === code)?.name ?? code,
      avgLevel: levels.reduce((a, b) => a + b, 0) / levels.length,
      affectedEmployees: levels.length,
    }))
    .sort((a, b) => a.avgLevel - b.avgLevel)
    .slice(0, 10);

  return { roles: roleData, globalTopWeakSkills };
}

export async function getDevelopmentOverview(input: { workspaceId: string; since?: string | null; until?: string | null }) {
  const since = input.since ? new Date(input.since) : null;
  const until = input.until ? new Date(input.until) : null;
  const goals = await db.select().from(developmentGoals).where(eq(developmentGoals.workspaceId, input.workspaceId));
  const completedLastPeriod = goals.filter((g) => g.status === "completed" && inRange(g.updatedAt ?? g.createdAt, since, until)).length;
  const overdueGoals = goals.filter((g) => g.status === "active" && g.dueDate && new Date(g.dueDate) < new Date()).length;
  const highPriorityOverdue = goals.filter((g) => g.priority === 1 && g.status === "active" && g.dueDate && new Date(g.dueDate) < new Date()).length;

  const assignments = await db.select().from(employeeRoleAssignments).where(eq(employeeRoleAssignments.workspaceId, input.workspaceId));
  const roles = await db.select().from(roleProfiles).where(eq(roleProfiles.workspaceId, input.workspaceId));
  const byRole = roles.map((role) => {
    const empIds = assignments.filter((a) => a.roleProfileId === role.id).map((a) => a.employeeId);
    const roleGoals = goals.filter((g) => empIds.includes(g.employeeId));
    return {
      roleId: role.id,
      roleName: role.name,
      activeGoals: roleGoals.filter((g) => g.status === "active").length,
      completedLastPeriod: roleGoals.filter((g) => g.status === "completed" && inRange(g.updatedAt ?? g.createdAt, since, until)).length,
      overdueGoals: roleGoals.filter((g) => g.status === "active" && g.dueDate && new Date(g.dueDate) < new Date()).length,
    };
  });

  return {
    totals: {
      totalGoals: goals.length,
      activeGoals: goals.filter((g) => g.status === "active").length,
      completedGoals: goals.filter((g) => g.status === "completed").length,
      completedLastPeriod,
      overdueGoals,
      highPriorityOverdue,
    },
    byRole,
  };
}

export async function getPilotsOverview(input: { workspaceId: string; since?: string | null; until?: string | null }) {
  const pilotsRows = await db.select().from(pilotRuns).where(eq(pilotRuns.workspaceId, input.workspaceId));
  const participants = await db.select().from(pilotRunParticipants).where(eq(pilotRunParticipants.workspaceId, input.workspaceId));
  const completed = pilotsRows.filter((p) => p.status === "completed").length;
  const active = pilotsRows.filter((p) => p.status === "active").length;
  const participantsTotal = participants.length;
  const avgParticipantsPerPilot = pilotsRows.length ? Number((participantsTotal / pilotsRows.length).toFixed(2)) : 0;
  const byStatusMap = new Map<string, number>();
  pilotsRows.forEach((p) => byStatusMap.set(p.status, (byStatusMap.get(p.status) ?? 0) + 1));
  const byStatus = Array.from(byStatusMap.entries()).map(([status, count]) => ({ status, count }));
  const byOwnerMap = new Map<string, { activePilots: number; completedPilots: number }>();
  pilotsRows.forEach((p) => {
    const entry = byOwnerMap.get(p.ownerUserId) ?? { activePilots: 0, completedPilots: 0 };
    if (p.status === "active") entry.activePilots += 1;
    if (p.status === "completed") entry.completedPilots += 1;
    byOwnerMap.set(p.ownerUserId, entry);
  });
  const byOwner = Array.from(byOwnerMap.entries()).map(([ownerId, data]) => ({ ownerId, activePilots: data.activePilots, completedPilots: data.completedPilots }));
  return {
    totals: { activePilots: active, completedPilots: completed, participantsTotal, avgParticipantsPerPilot },
    byStatus,
    byOwner,
  };
}

export async function getFeedbackOverview(input: { workspaceId: string; since?: string | null; until?: string | null }) {
  const surveys = await db.select().from(feedbackSurveys).where(eq(feedbackSurveys.workspaceId, input.workspaceId));
  const responses = surveys.length
    ? await db.select().from(feedbackResponses).where(and(eq(feedbackResponses.workspaceId, input.workspaceId), inArray(feedbackResponses.surveyId, surveys.map((s) => s.id))))
    : [];
  const answers = responses.length
    ? await db.select().from(feedbackAnswers).where(and(eq(feedbackAnswers.workspaceId, input.workspaceId), inArray(feedbackAnswers.responseId, responses.map((r) => r.id))))
    : [];
  const pulseSurveys = surveys.filter((s) => s.type === "pulse");
  const pulseResponses = responses.filter((r) => pulseSurveys.some((s) => s.id === r.surveyId));
  const pulseSubmitted = pulseResponses.filter((r) => r.status === "submitted");
  const pulseAnswers = answers.filter((a) => pulseSubmitted.some((r) => r.id === a.responseId));
  const pulseScaleValues = pulseAnswers.map((a) => a.scaleValue).filter((v) => v !== null && v !== undefined) as number[];
  const avgPulseScore = pulseScaleValues.length ? Number((pulseScaleValues.reduce((a, b) => a + b, 0) / pulseScaleValues.length).toFixed(2)) : null;
  const feedback = {
    surveys: {
      total: surveys.length,
      active: surveys.filter((s) => s.status === "active").length,
      closed: surveys.filter((s) => s.status === "closed").length,
    },
    pulse: {
      avgScore: avgPulseScore,
      responseRate: pulseResponses.length ? Number(((pulseSubmitted.length / pulseResponses.length) * 100).toFixed(2)) : null,
    },
    reviews: {
      totalResponses: responses.filter((r) => r.surveyId && surveys.find((s) => s.id === r.surveyId)?.type === "review").length,
      submittedResponses: responses.filter((r) => r.status === "submitted" && surveys.find((s) => s.id === r.surveyId)?.type === "review").length,
    },
  };
  return feedback;
}

export async function getRiskOverview(input: { workspaceId: string }) {
  const employeesRows = await db.select().from(employees).where(eq(employees.workspaceId, input.workspaceId));
  const goals = await db.select().from(developmentGoals).where(eq(developmentGoals.workspaceId, input.workspaceId));
  const ratings = await db.select().from(employeeSkillRatings).where(eq(employeeSkillRatings.workspaceId, input.workspaceId));
  const highRiskEmployees: { employeeId: string; employeeName?: string; roleName?: string; reasons: string[] }[] = [];
  employeesRows.forEach((emp) => {
    const reasons: string[] = [];
    const lowSkills = ratings.filter((r) => r.employeeId === emp.id && r.level <= 2);
    if (lowSkills.length >= 3) reasons.push("low_skill_on_key_role");
    const overdueGoals = goals.filter((g) => g.employeeId === emp.id && g.priority === 1 && g.dueDate && new Date(g.dueDate) < new Date());
    if (overdueGoals.length >= 2) reasons.push("many_overdue_goals");
    if (reasons.length) highRiskEmployees.push({ employeeId: emp.id, employeeName: emp.name, reasons });
  });
  return { highRiskEmployees };
}

export async function getOutcomesSummary(workspaceId: string) {
  const [programs, programOutcomeRows, pilots, pilotOutcomeRows] = await Promise.all([
    db.select().from(workspacePrograms).where(eq(workspacePrograms.workspaceId, workspaceId)),
    db.select().from(programOutcomes).where(eq(programOutcomes.workspaceId, workspaceId)),
    db.select().from(pilotRuns).where(eq(pilotRuns.workspaceId, workspaceId)),
    db.select().from(pilotOutcomes).where(eq(pilotOutcomes.workspaceId, workspaceId)),
  ]);
  const sentimentCount = { positive: 0, neutral: 0, negative: 0 };
  programOutcomeRows.forEach((o) => {
    if (sentimentCount[o.sentiment as "positive" | "neutral" | "negative"] !== undefined) {
      sentimentCount[o.sentiment as "positive" | "neutral" | "negative"] += 1;
    }
  });
  const pilotSentiment = { positive: 0, neutral: 0, negative: 0 };
  pilotOutcomeRows.forEach((o) => {
    if (pilotSentiment[o.sentiment as "positive" | "neutral" | "negative"] !== undefined) {
      pilotSentiment[o.sentiment as "positive" | "neutral" | "negative"] += 1;
    }
  });
  return {
    programsWithOutcome: programOutcomeRows.length,
    programsTotal: programs.length,
    pilotsWithOutcome: pilotOutcomeRows.length,
    pilotsTotal: pilots.length,
    programSentiment: sentimentCount,
    pilotSentiment,
  };
}

export async function getSkillGapOverview(workspaceId: string) {
  const [reqs, assignments, ratings] = await Promise.all([
    db.select().from(roleSkillRequirements).where(eq(roleSkillRequirements.workspaceId, workspaceId)),
    db.select().from(employeeRoleAssignments).where(eq(employeeRoleAssignments.workspaceId, workspaceId)),
    db.select().from(employeeSkillRatings).where(eq(employeeSkillRatings.workspaceId, workspaceId)),
  ]);
  const employeesByRole = new Map<string, string[]>();
  assignments.forEach((a) => {
    const list = employeesByRole.get(a.roleProfileId) ?? [];
    list.push(a.employeeId);
    employeesByRole.set(a.roleProfileId, list);
  });
  let totalCombos = 0;
  let missingRatings = 0;
  let satisfied = 0;
  reqs.forEach((req) => {
    const emps = employeesByRole.get(req.roleId) ?? [];
    emps.forEach((empId) => {
      totalCombos += 1;
      const rating = ratings.find((r) => r.employeeId === empId && r.skillCode === req.skillId);
      if (!rating) {
        missingRatings += 1;
        return;
      }
      if (rating.level >= req.requiredLevel) satisfied += 1;
    });
  });
  const percentSatisfied = totalCombos > 0 ? Math.round((satisfied / totalCombos) * 100) : 0;
  return { percentSatisfied, missingRatings, totalCombos };
}

export async function getCompanyHealthSnapshot(workspaceId: string) {
  const now = new Date();
  const since30 = new Date();
  since30.setDate(now.getDate() - 30);

  const [programs, outcomes, gapOverview, surveys, responses, oneOnOneRows, goalsRows, pilotOutcomeRows, , qReports] = await Promise.all([
    db.select().from(workspacePrograms).where(eq(workspacePrograms.workspaceId, workspaceId)),
    db.select().from(programOutcomes).where(eq(programOutcomes.workspaceId, workspaceId)),
    getSkillGapOverview(workspaceId),
    db.select().from(feedbackSurveys).where(eq(feedbackSurveys.workspaceId, workspaceId)),
    db.select().from(feedbackResponses).where(eq(feedbackResponses.workspaceId, workspaceId)),
    db.select().from(oneOnOnes).where(eq(oneOnOnes.workspaceId, workspaceId)),
    db.select().from(developmentGoals).where(eq(developmentGoals.workspaceId, workspaceId)),
    db.select().from(pilotOutcomes).where(eq(pilotOutcomes.workspaceId, workspaceId)),
    db.select().from(pilotRuns).where(eq(pilotRuns.workspaceId, workspaceId)),
    db.select().from(quarterlyReports).where(eq(quarterlyReports.workspaceId, workspaceId)),
  ]);

  const programsInfo = {
    total: programs.length,
    active: programs.filter((p) => p.status === "active").length,
    completed: programs.filter((p) => p.status === "completed").length,
    withOutcomes: outcomes.length,
  };

  const rolesTracked = await db.select().from(roleProfiles).where(eq(roleProfiles.workspaceId, workspaceId));
  const avgGapKeyRoles = gapOverview.totalCombos > 0 ? (gapOverview.percentSatisfied - 100) / 100 : null;
  const skillGap = {
    rolesTracked: rolesTracked.length,
    avgGapKeyRoles,
    fullyCoveredEmployeesPct: gapOverview.percentSatisfied,
    skillsWithoutRatings: gapOverview.missingRatings,
  };

  const pulseSurveys = surveys.filter((s) => s.type === "pulse");
  const pulseResponses = pulseSurveys.length
    ? responses.filter((r) => pulseSurveys.some((s) => s.id === r.surveyId))
    : [];
  const pulseSubmitted = pulseResponses.filter((r) => r.status === "submitted");
  const avgResponseRate = pulseResponses.length ? Number(((pulseSubmitted.length / pulseResponses.length) * 100).toFixed(2)) : null;
  const lastPulse = pulseSurveys.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const feedback = {
    activeSurveys: surveys.filter((s) => s.status === "active").length,
    avgResponseRate,
    lastPulseSentAt: lastPulse?.createdAt ?? null,
    lastPulseSentiment: null as "positive" | "neutral" | "negative" | null, // TODO: вычислять по ответам
  };

  const oneOnOnesInfo = {
    last30dCount: oneOnOneRows.filter((o) => inRange(o.scheduledAt, since30, now)).length,
    employeesWithoutRecent1on1: 0, // TODO: вычислять по людям без 1:1
  };

  const goals = {
    activeGoals: goalsRows.filter((g) => g.status === "active").length,
    overdueGoals: goalsRows.filter((g) => g.status === "active" && g.dueDate && new Date(g.dueDate) < now).length,
    completedLast30d: goalsRows.filter((g) => g.status === "completed" && inRange(g.updatedAt ?? g.createdAt, since30, now)).length,
  };

  const outcomesInfo = {
    programsWithOutcomes: outcomes.length,
    pilotsWithOutcomes: pilotOutcomeRows.length,
  };

  const report = qReports.sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())[0];
  const currentYear = now.getFullYear();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const hasCurrentQuarterDraft = qReports.some((r) => r.year === currentYear && r.quarter === currentQuarter);
  const reportsInfo = {
    lastQuarterReportId: report?.id ?? null,
    lastQuarterLabel: report ? `Q${report.quarter} ${report.year}` : null,
    hasCurrentQuarterDraft,
  };

  return { programs: programsInfo, skillGap, feedback, oneOnOnes: oneOnOnesInfo, goals, outcomes: outcomesInfo, reports: reportsInfo };
}

export async function getTeamHealthSnapshot(input: { workspaceId: string; managerId: string }) {
  const now = new Date();
  const since30 = new Date();
  since30.setDate(now.getDate() - 30);
  // Определяем сотрудников команды по 1:1 как приближенный способ
  const managerMeetings = await db
    .select()
    .from(oneOnOnes)
    .where(and(eq(oneOnOnes.workspaceId, input.workspaceId), eq(oneOnOnes.managerId, input.managerId)));
  const teamEmployeeIds = Array.from(new Set(managerMeetings.map((m) => m.employeeId)));

  const goalsRows = teamEmployeeIds.length
    ? await db.select().from(developmentGoals).where(and(eq(developmentGoals.workspaceId, input.workspaceId), inArray(developmentGoals.employeeId, teamEmployeeIds)))
    : [];

  const teamPrograms = await db
    .select()
    .from(workspacePrograms)
    .where(and(eq(workspacePrograms.workspaceId, input.workspaceId), eq(workspacePrograms.ownerId, input.managerId)));

  const skillGaps =
    teamEmployeeIds.length > 0
      ? await getEmployeeSkillLevels(input.workspaceId, teamEmployeeIds)
      : [];
  const avgGapForTeamRoles = skillGaps.length ? null : null; // TODO: вычислить при наличии данных о требованиях

  const feedbackResp = teamEmployeeIds.length
    ? await db.select().from(feedbackResponses).where(and(eq(feedbackResponses.workspaceId, input.workspaceId), inArray(feedbackResponses.respondentId, teamEmployeeIds)))
    : [];
  const feedbackSubmitted = feedbackResp.filter((r) => r.status === "submitted");
  const teamResponseRate = feedbackResp.length ? Number(((feedbackSubmitted.length / feedbackResp.length) * 100).toFixed(2)) : null;

  const oneOnOnePlannedNext7 = managerMeetings.filter((m) => inRange(m.scheduledAt, now, daysFromNow(7))).length;
  const oneOnOneDoneLast30 = managerMeetings.filter((m) => inRange(m.scheduledAt, since30, now) && m.status === "completed").length;

  const employeesWithoutGoals = teamEmployeeIds.length
    ? teamEmployeeIds.filter((id) => !goalsRows.some((g) => g.employeeId === id && g.status === "active")).length
    : 0;

  return {
    teamSize: teamEmployeeIds.length,
    programs: {
      activeForTeam: teamPrograms.filter((p) => p.status === "active").length,
      completedForTeam: teamPrograms.filter((p) => p.status === "completed").length,
    },
    skillGap: {
      avgGapForTeamRoles,
      criticalSkills: [],
    },
    feedback: {
      lastPulseForTeamSentAt: null,
      teamResponseRate,
      negativeSignalsCount: 0,
    },
    oneOnOnes: {
      plannedNext7d: oneOnOnePlannedNext7,
      doneLast30d: oneOnOneDoneLast30,
      employeesWithoutRecent1on1: 0,
    },
    goals: {
      employeesWithoutGoals,
      overdueGoals: goalsRows.filter((g) => g.status === "active" && g.dueDate && new Date(g.dueDate) < now).length,
    },
  };
}


function inRange(dateStr: string | null | undefined, since: Date | null, until: Date | null) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  if (since && d < since) return false;
  if (until && d > until) return false;
  return true;
}

function normalizeInput(input: WorkspaceParams): { workspaceId: string; since: string | null; until: string | null } {
  if (typeof input === "string") {
    return { workspaceId: input, since: null, until: null };
  }
  return { workspaceId: input.workspaceId, since: input.since ?? null, until: input.until ?? null };
}

// Legacy helpers for existing tests (Top/Weak skills and employee risks)
export async function getTopSkills(workspaceId: string, limit = 5) {
  const ratingRows = await db.select().from(employeeSkillRatings).where(eq(employeeSkillRatings.workspaceId, workspaceId));
  const skillRows = await db.select().from(skills).where(eq(skills.workspaceId, workspaceId));
  const grouped = new Map<string, number[]>();
  ratingRows.forEach((row) => {
    grouped.set(row.skillCode, [...(grouped.get(row.skillCode) ?? []), row.level]);
  });
  return Array.from(grouped.entries())
    .map(([skillCode, levels]) => {
      const skill = skillRows.find((s) => s.id === skillCode || s.name === skillCode);
      const averageLevel = levels.reduce((a, b) => a + b, 0) / levels.length;
      return {
        skillId: skill?.id ?? skillCode,
        name: skill?.name ?? skillCode,
        averageLevel,
        employeesWithSkillCount: levels.length,
      };
    })
    .sort((a, b) => b.averageLevel - a.averageLevel)
    .slice(0, limit);
}

export async function getWeakSkills(workspaceId: string, limit = 5) {
  const ratingRows = await db.select().from(employeeSkillRatings).where(eq(employeeSkillRatings.workspaceId, workspaceId));
  const skillRows = await db.select().from(skills).where(eq(skills.workspaceId, workspaceId));
  const grouped = new Map<string, number[]>();
  ratingRows.forEach((row) => {
    grouped.set(row.skillCode, [...(grouped.get(row.skillCode) ?? []), row.level]);
  });
  return Array.from(grouped.entries())
    .map(([skillCode, levels]) => {
      const skill = skillRows.find((s) => s.id === skillCode || s.name === skillCode);
      const averageLevel = levels.reduce((a, b) => a + b, 0) / levels.length;
      return {
        skillId: skill?.id ?? skillCode,
        name: skill?.name ?? skillCode,
        averageLevel,
        employeesWithSkillCount: levels.length,
      };
    })
    .sort((a, b) => a.averageLevel - b.averageLevel)
    .slice(0, limit);
}

export async function getEmployeesRiskList(workspaceId: string, limit = 10) {
  const employeeRows = await db.select().from(employees).where(eq(employees.workspaceId, workspaceId));
  const ratingRows = await db.select().from(employeeSkillRatings).where(eq(employeeSkillRatings.workspaceId, workspaceId));
  const result: Array<{ id: string; name: string; problems: Array<{ skillName: string; level: number }> }> = [];
  employeeRows.forEach((emp) => {
    const empRatings = ratingRows.filter((r) => r.employeeId === emp.id);
    if (empRatings.length === 0) {
      result.push({ id: emp.id, name: emp.name, problems: [{ skillName: "Нет данных по навыкам", level: 0 }] });
      return;
    }
    const lowSkills = empRatings.filter((r) => r.level <= 2).map((r) => ({ skillName: r.skillCode, level: r.level }));
    if (lowSkills.length > 0) {
      result.push({ id: emp.id, name: emp.name, problems: lowSkills });
    }
  });
  return result.slice(0, limit);
}

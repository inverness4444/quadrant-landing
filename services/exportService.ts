import { db } from "@/lib/db";
import {
  developmentGoals,
  employees,
  employeeSkillRatings,
  roleProfiles,
  roleProfileSkillRequirements,
  skills,
  pilotRuns,
  pilotRunParticipants,
  workspacePrograms,
  oneOnOnes,
  feedbackSurveys,
  feedbackResponses,
  quarterlyReports,
} from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export type CompanyGoalsExportRow = {
  employeeId: string;
  employeeName: string;
  managerName: string | null;
  roleName: string | null;
  goalId: string;
  goalTitle: string;
  status: "active" | "completed" | "overdue";
  createdAt: string;
  completedAt: string | null;
  targetDate: string | null;
  source: string | null;
};

export type SkillGapExportRow = {
  employeeId: string;
  employeeName: string;
  roleName: string | null;
  skillId: string;
  skillName: string;
  requiredLevel: number | null;
  currentLevel: number | null;
  gap: number | null;
  importance: number | null;
};

export type ProgramsExportRow = {
  programId: string;
  programName: string;
  type: "program" | "pilot";
  ownerName: string | null;
  status: "planned" | "active" | "completed";
  participantsCount: number;
  startedAt: string | null;
  endedAt: string | null;
};

export type OneOnOnesExportRow = {
  oneOnOneId: string;
  managerName: string;
  employeeName: string;
  scheduledAt: string;
  status: "scheduled" | "completed" | "cancelled";
  lastUpdatedAt: string;
  hasNotes: boolean;
};

export type SurveysExportRow = {
  surveyId: string;
  title: string;
  type: "pulse" | "engagement" | "custom";
  sentAt: string | null;
  dueDate: string | null;
  responseRate: number | null;
};

export type QuarterlyReportsExportRow = {
  reportId: string;
  periodStart: string;
  periodEnd: string;
  title: string;
  ownerName: string | null;
  isLocked: boolean;
  createdAt: string;
};

export async function buildCompanyGoalsExport(input: { workspaceId: string; periodStart?: Date; periodEnd?: Date; managerId?: string | null }): Promise<CompanyGoalsExportRow[]> {
  const goals = await db.select().from(developmentGoals).where(eq(developmentGoals.workspaceId, input.workspaceId));
  const empRows = await db.select().from(employees).where(eq(employees.workspaceId, input.workspaceId));
  const roleRows = await db.select().from(roleProfiles).where(eq(roleProfiles.workspaceId, input.workspaceId));
  const byEmp = new Map(empRows.map((e) => [e.id, e]));
  const byRole = new Map(roleRows.map((r) => [r.id, r]));
  const start = input.periodStart?.getTime() ?? null;
  const end = input.periodEnd?.getTime() ?? null;
  const rows: CompanyGoalsExportRow[] = [];
  goals.forEach((goal) => {
    const created = Date.parse(goal.createdAt);
    if (start && created < start) return;
    if (end && created > end) return;
    const emp = goal.employeeId ? byEmp.get(goal.employeeId) : undefined;
    if (input.managerId && emp?.managerId !== input.managerId) return;
    const manager = emp?.managerId ? byEmp.get(emp.managerId) : undefined;
    const role = emp?.roleProfileId ? byRole.get(emp.roleProfileId) : undefined;
    const status: CompanyGoalsExportRow["status"] = goal.status === "completed" ? "completed" : goal.dueDate && new Date(goal.dueDate) < new Date() ? "overdue" : "active";
    rows.push({
      employeeId: goal.employeeId ?? "",
      employeeName: emp?.name ?? "",
      managerName: manager?.name ?? null,
      roleName: role?.name ?? null,
      goalId: goal.id,
      goalTitle: goal.title,
      status,
      createdAt: goal.createdAt,
      completedAt: goal.updatedAt ?? null,
      targetDate: goal.dueDate ?? null,
      source: goal.source ?? null,
    });
  });
  return rows;
}

export async function buildSkillGapExport(input: { workspaceId: string; snapshotDate?: Date; managerId?: string | null }): Promise<SkillGapExportRow[]> {
  const empRows = await db.select().from(employees).where(eq(employees.workspaceId, input.workspaceId));
  const roleReqs = await db.select().from(roleProfileSkillRequirements).where(eq(roleProfileSkillRequirements.workspaceId, input.workspaceId));
  const skillRows = await db.select().from(skills).where(eq(skills.workspaceId, input.workspaceId));
  const ratings = await db.select().from(employeeSkillRatings).where(eq(employeeSkillRatings.workspaceId, input.workspaceId));
  const bySkill = new Map(skillRows.map((s) => [s.id, s]));
  const byReq = new Map<string, { requiredLevel: number | null; importance: number | null }>();
  roleReqs.forEach((req) => {
    byReq.set(`${req.roleProfileId}-${req.skillId}`, { requiredLevel: req.requiredLevel ?? null, importance: req.importance ?? null });
  });
  const rows: SkillGapExportRow[] = [];
  empRows.forEach((emp) => {
    if (input.managerId && emp.managerId !== input.managerId) return;
    const roleId = emp.roleProfileId ?? null;
    const relevantReqs = roleReqs.filter((req) => req.roleProfileId === roleId);
    relevantReqs.forEach((req) => {
      const rating = ratings
        .filter((r) => r.employeeId === emp.id && r.skillId === req.skillId)
        .sort((a, b) => Date.parse(b.ratedAt ?? b.createdAt) - Date.parse(a.ratedAt ?? a.createdAt))[0];
      const skill = bySkill.get(req.skillId);
      const currentLevel = rating?.level ?? null;
      const requiredLevel = req.requiredLevel ?? null;
      const gap = currentLevel !== null && requiredLevel !== null ? currentLevel - requiredLevel : null;
      rows.push({
        employeeId: emp.id,
        employeeName: emp.name ?? "",
        roleName: null,
        skillId: req.skillId,
        skillName: skill?.name ?? "",
        requiredLevel,
        currentLevel,
        gap,
        importance: req.importance ?? null,
      });
    });
  });
  return rows;
}

export async function buildProgramsExport(input: { workspaceId: string; includePilots?: boolean }): Promise<ProgramsExportRow[]> {
  const programs = await db.select().from(workspacePrograms).where(eq(workspacePrograms.workspaceId, input.workspaceId));
  const pilots = input.includePilots ? await db.select().from(pilotRuns).where(eq(pilotRuns.workspaceId, input.workspaceId)) : [];
  const participants = input.includePilots
    ? await db.select().from(pilotRunParticipants).where(eq(pilotRunParticipants.workspaceId, input.workspaceId))
    : [];
  const rows: ProgramsExportRow[] = programs.map((p) => ({
    programId: p.id,
    programName: p.name,
    type: "program",
    ownerName: null,
    status: (p.status as ProgramsExportRow["status"]) ?? "active",
    participantsCount: Array.isArray(p.targetEmployeeIds) ? p.targetEmployeeIds.length : 0,
    startedAt: p.startedAt ?? null,
    endedAt: p.actualEndAt ?? p.plannedEndAt ?? null,
  }));
  pilots.forEach((pilot) => {
    const count = participants.filter((pt) => pt.pilotRunId === pilot.id).length;
    rows.push({
      programId: pilot.id,
      programName: pilot.name,
      type: "pilot",
      ownerName: null,
      status: (pilot.status as ProgramsExportRow["status"]) ?? "active",
      participantsCount: count,
      startedAt: pilot.startDate ?? null,
      endedAt: pilot.endDate ?? null,
    });
  });
  return rows;
}

export async function buildOneOnOnesExport(input: { workspaceId: string; periodStart?: Date; periodEnd?: Date; managerId?: string | null }): Promise<OneOnOnesExportRow[]> {
  const rows = await db.select().from(oneOnOnes).where(eq(oneOnOnes.workspaceId, input.workspaceId));
  const start = input.periodStart?.getTime() ?? null;
  const end = input.periodEnd?.getTime() ?? null;
  const employeesRows = await db.select().from(employees).where(eq(employees.workspaceId, input.workspaceId));
  const byEmp = new Map(employeesRows.map((e) => [e.id, e]));
  return rows
    .filter((row) => {
      const ts = Date.parse(row.scheduledAt);
      if (start && ts < start) return false;
      if (end && ts > end) return false;
      if (input.managerId && row.managerId !== input.managerId) return false;
      return true;
    })
    .map((row) => {
      const manager = byEmp.get(row.managerId ?? "");
      const emp = byEmp.get(row.employeeId ?? "");
      return {
        oneOnOneId: row.id,
        managerName: manager?.name ?? "",
        employeeName: emp?.name ?? "",
        scheduledAt: row.scheduledAt,
        status: row.status as OneOnOnesExportRow["status"],
        lastUpdatedAt: row.updatedAt ?? row.createdAt,
        hasNotes: false,
      };
    });
}

export async function buildSurveysExport(input: { workspaceId: string; periodStart?: Date; periodEnd?: Date }): Promise<SurveysExportRow[]> {
  const surveys = await db.select().from(feedbackSurveys).where(eq(feedbackSurveys.workspaceId, input.workspaceId));
  const responses = await db.select().from(feedbackResponses).where(eq(feedbackResponses.workspaceId, input.workspaceId));
  const start = input.periodStart?.getTime() ?? null;
  const end = input.periodEnd?.getTime() ?? null;
  return surveys
    .filter((s) => {
      const sent = s.startDate ? Date.parse(s.startDate) : null;
      if (start && sent && sent < start) return false;
      if (end && sent && sent > end) return false;
      return true;
    })
    .map((s) => {
      const sent = s.startDate ?? null;
      const surveyResponses = responses.filter((r) => r.surveyId === s.id);
      const submitted = surveyResponses.filter((r) => r.status === "submitted").length;
      const responseRate = surveyResponses.length ? Number(((submitted / surveyResponses.length) * 100).toFixed(2)) : null;
      return {
        surveyId: s.id,
        title: s.title,
        type: (s.type as SurveysExportRow["type"]) ?? "custom",
        sentAt: sent,
        dueDate: s.endDate ?? null,
        responseRate,
      };
    });
}

export async function buildQuarterlyReportsExport(input: { workspaceId: string; year?: number }): Promise<QuarterlyReportsExportRow[]> {
  const reports = await db.select().from(quarterlyReports).where(eq(quarterlyReports.workspaceId, input.workspaceId));
  return reports
    .filter((r) => {
      if (!input.year) return true;
      return r.year === input.year;
    })
    .map((r) => ({
      reportId: r.id,
      periodStart: r.periodStart ?? "",
      periodEnd: r.periodEnd ?? "",
      title: r.title,
      ownerName: null,
      isLocked: r.isLocked ?? false,
      createdAt: r.createdAt,
    }));
}

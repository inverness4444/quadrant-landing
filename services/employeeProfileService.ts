import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  developmentGoals,
  employees,
  feedbackResponses,
  feedbackSurveys,
  oneOnOnes,
  pilotRunParticipants,
  pilotRuns,
  workspacePrograms,
  users,
} from "@/drizzle/schema";
import { computeSkillProfileForEmployee } from "@/services/skillGapService";
import { resolveEmployeeForWorkspace } from "@/services/assessmentUtils";

export type EmployeeProfileSnapshot = {
  employeeId: string;
  workspaceId: string;
  name: string;
  roleName: string | null;
  managerName: string | null;
  programs: { id: string; name: string; status: string; isHighlighted: boolean }[];
  pilots: { id: string; name: string; status: string }[];
  goals: { id: string; title: string; status: "active" | "completed" | "overdue"; targetDate: string | null; createdAt: string; source: string }[];
  upcomingOneOnOnes: { id: string; withName: string; scheduledAt: string; location?: string | null }[];
  feedback: { activeSurveysCount: number; pendingSurveys: { id: string; title: string; dueDate: string | null }[]; lastPulseSentiment: "positive" | "neutral" | "negative" | null };
  skills: {
    roleId: string | null;
    items: { skillId: string; skillName: string; requiredLevel: number | null; currentLevel: number | null; gap: number | null; importance: number | null }[];
    topGaps: { skillId: string; skillName: string; gap: number; importance: number | null }[];
  };
};

export async function getEmployeeProfileSnapshot(input: { workspaceId: string; employeeId: string }): Promise<EmployeeProfileSnapshot> {
  const [employeeRow, goalsRows, programs, pilotParticipants, surveys, responses, meetings] = await Promise.all([
    db.query.employees.findFirst({ where: and(eq(employees.workspaceId, input.workspaceId), eq(employees.id, input.employeeId)) }),
    db.select().from(developmentGoals).where(and(eq(developmentGoals.workspaceId, input.workspaceId), eq(developmentGoals.employeeId, input.employeeId))),
    db.select().from(workspacePrograms).where(eq(workspacePrograms.workspaceId, input.workspaceId)),
    db.select().from(pilotRunParticipants).where(and(eq(pilotRunParticipants.workspaceId, input.workspaceId), eq(pilotRunParticipants.employeeId, input.employeeId))),
    db.select().from(feedbackSurveys).where(eq(feedbackSurveys.workspaceId, input.workspaceId)),
    db.select().from(feedbackResponses).where(eq(feedbackResponses.workspaceId, input.workspaceId)),
    db
      .select()
      .from(oneOnOnes)
      .where(and(eq(oneOnOnes.workspaceId, input.workspaceId), eq(oneOnOnes.employeeId, input.employeeId))),
  ]);

  const userManager = meetings[0]?.managerId ? await db.query.users.findFirst({ where: eq(users.id, meetings[0].managerId) }) : null;
  const managerName = userManager?.name ?? null;

  const programMembership = programs.filter((p) => parseJsonArray(p.targetEmployeeIds ?? "[]").includes(input.employeeId));
  const programView = programMembership.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    isHighlighted: p.status === "active",
  }));

  const pilotIds = Array.from(new Set(pilotParticipants.map((p) => p.pilotRunId)));
  const pilotRows = pilotIds.length
    ? await db.select().from(pilotRuns).where(and(eq(pilotRuns.workspaceId, input.workspaceId), inArray(pilotRuns.id, pilotIds)))
    : [];
  const pilotView = pilotRows.map((p) => ({ id: p.id, name: p.name, status: p.status }));

  const goalsView = goalsRows.map((g) => {
    const status: "active" | "completed" | "overdue" =
      g.status === "completed" ? "completed" : g.dueDate && new Date(g.dueDate) < new Date() ? "overdue" : "active";
    return {
      id: g.id,
      title: g.title,
      status,
      targetDate: g.dueDate ?? null,
      createdAt: g.createdAt,
      source: g.source ?? "manual",
    };
  });

  const now = new Date();
  const upcomingOneOnOnes = meetings
    .filter((m) => {
      const dt = new Date(m.scheduledAt);
      return dt >= now && dt <= addDays(now, 14);
    })
    .map((m) => ({
      id: m.id,
      withName: userManager?.name ?? "Менеджер",
      scheduledAt: m.scheduledAt,
      location: null,
    }));

  const activeSurveys = surveys.filter((s) => s.status === "active");
  const pendingSurveys = activeSurveys
    .map((s) => {
      const resp = responses.find((r) => r.surveyId === s.id && r.respondentId === input.employeeId);
      if (resp && resp.status === "submitted") return null;
      return { id: s.id, title: s.title, dueDate: s.endDate ?? null };
    })
    .filter(Boolean) as { id: string; title: string; dueDate: string | null }[];

  const feedback = {
    activeSurveysCount: activeSurveys.length,
    pendingSurveys,
    lastPulseSentiment: null as "positive" | "neutral" | "negative" | null,
  };

  const skillProfile = await computeSkillProfileForEmployee({ workspaceId: input.workspaceId, employeeId: input.employeeId });
  const topGaps =
    skillProfile.skills
      .filter((s) => s.gap === null || (s.gap ?? 0) < 0)
      .sort((a, b) => (a.gap ?? -999) - (b.gap ?? -999))
      .slice(0, 5)
      .map((s) => ({
        skillId: s.skillId,
        skillName: s.skillName ?? s.skillId,
        gap: s.gap ?? -2,
        importance: s.importance ?? null,
      })) ?? [];

  return {
    employeeId: input.employeeId,
    workspaceId: input.workspaceId,
    name: employeeRow?.name ?? "Сотрудник",
    roleName: employeeRow?.position ?? null,
    managerName,
    programs: programView,
    pilots: pilotView,
    goals: goalsView,
    upcomingOneOnOnes,
    feedback,
    skills: {
      roleId: skillProfile.roleId,
      items: skillProfile.skills.map((s) => ({
        skillId: s.skillId,
        skillName: s.skillName ?? s.skillId,
        requiredLevel: s.requiredLevel ?? null,
        currentLevel: s.currentLevel ?? null,
        gap: s.gap ?? null,
        importance: s.importance ?? null,
      })),
      topGaps,
    },
  };
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export async function resolveEmployeeIdForUser(workspaceId: string, userName: string | null) {
  const employee = await resolveEmployeeForWorkspace(workspaceId, userName);
  return employee?.id ?? null;
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

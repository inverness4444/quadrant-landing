import { and, eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import {
  assessmentCycleParticipants,
  assessmentCycleTeams,
  assessmentCycles,
  assessmentFinalStatuses,
  assessmentSelfStatuses,
  employees,
  employeeSkills,
  skills,
  skillAssessments,
  tracks,
  type AssessmentStatus,
} from "@/drizzle/schema";
import type {
  AssessmentCycleDTO,
  AssessmentParticipantDTO,
  SkillAssessmentDTO,
  TeamAssessmentSummaryDTO,
  WorkspaceAssessmentSummaryDTO,
} from "@/services/types/assessment";

export async function getWorkspaceCycles(workspaceId: string): Promise<AssessmentCycleDTO[]> {
  const cycles = await db.select().from(assessmentCycles).where(eq(assessmentCycles.workspaceId, workspaceId));
  const ids = cycles.map((cycle) => cycle.id);
  const teamRows =
    ids.length === 0
      ? []
      : await db.select().from(assessmentCycleTeams).where(inArray(assessmentCycleTeams.cycleId, ids));
  const teamsByCycle = new Map<string, string[]>();
  for (const row of teamRows) {
    const list = teamsByCycle.get(row.cycleId) ?? [];
    list.push(row.teamId);
    teamsByCycle.set(row.cycleId, list);
  }
  return cycles.map((cycle) => mapCycle(cycle, teamsByCycle.get(cycle.id) ?? []));
}

export async function getCycleById(cycleId: string, workspaceId: string): Promise<AssessmentCycleDTO | null> {
  const cycle = await db.query.assessmentCycles.findFirst({
    where: and(eq(assessmentCycles.id, cycleId), eq(assessmentCycles.workspaceId, workspaceId)),
  });
  if (!cycle) return null;
  const teams = await db
    .select()
    .from(assessmentCycleTeams)
    .where(eq(assessmentCycleTeams.cycleId, cycleId));
  return mapCycle(cycle, teams.map((team) => team.teamId));
}

export async function createCycle(input: {
  workspaceId: string;
  name: string;
  description?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  teamIds?: string[];
  createdByUserId: string;
}): Promise<AssessmentCycleDTO> {
  const id = randomUUID();
  db.insert(assessmentCycles)
    .values({
      id,
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description ?? null,
      status: "draft",
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      createdByUserId: input.createdByUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .run();
  if (input.teamIds?.length) {
    await syncCycleTeams(id, input.teamIds);
  }
  return (await getCycleById(id, input.workspaceId))!;
}

export async function updateCycle(input: {
  cycleId: string;
  workspaceId: string;
  name?: string;
  description?: string | null;
  status?: AssessmentStatus;
  startsAt?: string | null;
  endsAt?: string | null;
  teamIds?: string[];
}): Promise<AssessmentCycleDTO | null> {
  const cycle = await db.query.assessmentCycles.findFirst({
    where: and(eq(assessmentCycles.id, input.cycleId), eq(assessmentCycles.workspaceId, input.workspaceId)),
  });
  if (!cycle) return null;
  db.update(assessmentCycles)
    .set({
      name: input.name ?? cycle.name,
      description: input.description ?? cycle.description,
      status: input.status ?? cycle.status,
      startsAt: input.startsAt ?? cycle.startsAt,
      endsAt: input.endsAt ?? cycle.endsAt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(assessmentCycles.id, input.cycleId))
    .run();
  if (input.teamIds) {
    await syncCycleTeams(input.cycleId, input.teamIds);
  }
  const next = await getCycleById(input.cycleId, input.workspaceId);
  if (next && cycle.status !== "active" && next.status === "active") {
    await initializeCycle(next);
  }
  return next;
}

export async function getEmployeeAssessments(
  cycleId: string,
  employeeId: string,
  workspaceId: string,
): Promise<{
  cycle: AssessmentCycleDTO;
  assessments: SkillAssessmentDTO[];
  progress: number;
} | null> {
  const cycle = await getCycleById(cycleId, workspaceId);
  if (!cycle) return null;
  const rows = await db
    .select()
    .from(skillAssessments)
    .where(and(eq(skillAssessments.cycleId, cycleId), eq(skillAssessments.employeeId, employeeId)));
  const participant = await db.query.assessmentCycleParticipants.findFirst({
    where: and(eq(assessmentCycleParticipants.cycleId, cycleId), eq(assessmentCycleParticipants.employeeId, employeeId)),
  });
  const total = rows.length || 1;
  const completed = rows.filter((row) => row.selfLevel !== null).length;
  const progress = Math.round((completed / total) * 100);
  return {
    cycle,
    assessments: rows.map(mapSkillAssessment),
    progress: participant?.selfStatus === "submitted" ? 100 : progress,
  };
}

export async function updateSelfAssessment(input: {
  cycleId: string;
  employeeId: string;
  skillId: string;
  selfLevel: number;
  selfComment?: string | null;
  submit?: boolean;
}): Promise<SkillAssessmentDTO | null> {
  const assessment = await db.query.skillAssessments.findFirst({
    where: and(
      eq(skillAssessments.cycleId, input.cycleId),
      eq(skillAssessments.employeeId, input.employeeId),
      eq(skillAssessments.skillId, input.skillId),
    ),
  });
  if (!assessment) return null;
  const now = new Date().toISOString();
  db.update(skillAssessments)
    .set({
      selfLevel: input.selfLevel,
      selfComment: input.selfComment ?? null,
      status: input.submit ? "self_submitted" : assessment.status,
      updatedAt: now,
    })
    .where(eq(skillAssessments.id, assessment.id))
    .run();
  if (input.submit) {
    await updateSelfParticipantStatus(input.cycleId, input.employeeId);
  }
  const updated = await db.query.skillAssessments.findFirst({ where: eq(skillAssessments.id, assessment.id) });
  return updated ? mapSkillAssessment(updated) : null;
}

export async function getManagerAssessments(
  managerEmployeeId: string,
  cycleId: string,
  workspaceId: string,
): Promise<Array<{ participant: AssessmentParticipantDTO; skills: SkillAssessmentDTO[] }>> {
  const cycle = await getCycleById(cycleId, workspaceId);
  if (!cycle) return [];
  const participants = await db
    .select()
    .from(assessmentCycleParticipants)
    .where(and(eq(assessmentCycleParticipants.cycleId, cycleId), eq(assessmentCycleParticipants.managerEmployeeId, managerEmployeeId)));
  if (participants.length === 0) return [];
  const assessments = await db
    .select()
    .from(skillAssessments)
    .where(
      and(
        eq(skillAssessments.cycleId, cycleId),
        inArray(skillAssessments.employeeId, participants.map((p) => p.employeeId)),
      ),
    );
  return participants.map((participant) => ({
    participant: mapParticipant(participant),
    skills: assessments.filter((row) => row.employeeId === participant.employeeId).map(mapSkillAssessment),
  }));
}

export async function updateManagerAssessment(input: {
  cycleId: string;
  employeeId: string;
  skillId: string;
  managerLevel: number;
  managerComment?: string | null;
  finalizeSkill?: boolean;
}): Promise<SkillAssessmentDTO | null> {
  const assessment = await db.query.skillAssessments.findFirst({
    where: and(
      eq(skillAssessments.cycleId, input.cycleId),
      eq(skillAssessments.employeeId, input.employeeId),
      eq(skillAssessments.skillId, input.skillId),
    ),
  });
  if (!assessment) return null;
  const nextStatus = input.finalizeSkill ? "finalized" : "manager_review";
  const now = new Date().toISOString();
  db.update(skillAssessments)
    .set({
      managerLevel: input.managerLevel,
      managerComment: input.managerComment ?? null,
      finalLevel: input.finalizeSkill ? input.managerLevel : assessment.finalLevel,
      status: nextStatus,
      updatedAt: now,
    })
    .where(eq(skillAssessments.id, assessment.id))
    .run();
  if (input.finalizeSkill) {
    await updateParticipantFinalStatus(input.cycleId, input.employeeId);
  } else {
    await markManagerInProgress(input.cycleId, input.employeeId);
  }
  const updated = await db.query.skillAssessments.findFirst({ where: eq(skillAssessments.id, assessment.id) });
  return updated ? mapSkillAssessment(updated) : null;
}

export async function getTeamAssessmentSummary(cycleId: string, teamId: string): Promise<TeamAssessmentSummaryDTO | null> {
  const team = await db.query.tracks.findFirst({ where: eq(tracks.id, teamId) });
  if (!team) return null;
  const employeesInTeam = await db.select().from(employees).where(eq(employees.primaryTrackId, teamId));
  if (employeesInTeam.length === 0) {
    return {
      teamId,
      teamName: team.name,
      averageGap: 0,
      finalizedPercent: 0,
      selfSubmittedPercent: 0,
    };
  }
  const employeeIds = employeesInTeam.map((employee) => employee.id);
  const participantRows = await db
    .select()
    .from(assessmentCycleParticipants)
    .where(and(eq(assessmentCycleParticipants.cycleId, cycleId), inArray(assessmentCycleParticipants.employeeId, employeeIds)));
  const assessmentRows = await db
    .select()
    .from(skillAssessments)
    .where(and(eq(skillAssessments.cycleId, cycleId), inArray(skillAssessments.employeeId, employeeIds)));
  const gaps = assessmentRows
    .filter((row) => row.selfLevel !== null && row.managerLevel !== null)
    .map((row) => Math.abs((row.selfLevel ?? 0) - (row.managerLevel ?? 0)));
  const averageGap = gaps.length === 0 ? 0 : Math.round((gaps.reduce((sum, g) => sum + g, 0) / gaps.length) * 10) / 10;
  const finalizedPercent =
    participantRows.length === 0
      ? 0
      : Math.round(
          (participantRows.filter((p) => p.finalStatus === "completed").length / participantRows.length) * 100,
        );
  const selfSubmittedPercent =
    participantRows.length === 0
      ? 0
      : Math.round(
          (participantRows.filter((p) => p.selfStatus === "submitted").length / participantRows.length) * 100,
        );
  return {
    teamId,
    teamName: team.name,
    averageGap,
    finalizedPercent,
    selfSubmittedPercent,
  };
}

export async function getWorkspaceAssessmentSummary(
  cycleId: string,
  workspaceId: string,
): Promise<WorkspaceAssessmentSummaryDTO | null> {
  const cycle = await getCycleById(cycleId, workspaceId);
  if (!cycle) return null;
  const participantRows = await db.select().from(assessmentCycleParticipants).where(eq(assessmentCycleParticipants.cycleId, cycleId));
  const assessmentRows = await db.select().from(skillAssessments).where(eq(skillAssessments.cycleId, cycleId));
  const gaps = assessmentRows
    .filter((row) => row.selfLevel !== null && row.managerLevel !== null)
    .map((row) => Math.abs((row.selfLevel ?? 0) - (row.managerLevel ?? 0)));
  const averageGap = gaps.length === 0 ? 0 : Math.round((gaps.reduce((sum, g) => sum + g, 0) / gaps.length) * 10) / 10;
  const finalizedPercent =
    participantRows.length === 0
      ? 0
      : Math.round(
          (participantRows.filter((p) => p.finalStatus === "completed").length / participantRows.length) * 100,
        );
  const selfSubmittedPercent =
    participantRows.length === 0
      ? 0
      : Math.round(
          (participantRows.filter((p) => p.selfStatus === "submitted").length / participantRows.length) * 100,
        );
  const teams =
    cycle.teamIds.length === 0
      ? []
      : await Promise.all(cycle.teamIds.map((teamId) => getTeamAssessmentSummary(cycleId, teamId))).then((items) =>
          items.filter(Boolean) as TeamAssessmentSummaryDTO[],
        );
  return {
    cycleId,
    participants: participantRows.length,
    finalizedPercent,
    averageGap,
    teams,
    selfSubmittedPercent,
  };
}

async function syncCycleTeams(cycleId: string, teamIds: string[]) {
  db.delete(assessmentCycleTeams).where(eq(assessmentCycleTeams.cycleId, cycleId)).run();
  for (const teamId of teamIds) {
    db.insert(assessmentCycleTeams)
      .values({
        id: randomUUID(),
        cycleId,
        teamId,
      })
      .run();
  }
}

async function initializeCycle(cycle: AssessmentCycleDTO) {
  const teamIds = cycle.teamIds;
  const employeesInTeams =
    teamIds.length === 0
      ? await db.select().from(employees).where(eq(employees.workspaceId, cycle.workspaceId))
      : await db.select().from(employees).where(and(eq(employees.workspaceId, cycle.workspaceId), inArray(employees.primaryTrackId, teamIds)));
  const employeeSkillsRows =
    employeesInTeams.length === 0
      ? []
      : await db.select().from(employeeSkills).where(inArray(employeeSkills.employeeId, employeesInTeams.map((emp) => emp.id)));
  const skillsMap = new Map<string, typeof skills.$inferSelect>();
  const skillsList = await db.select().from(skills).where(eq(skills.workspaceId, cycle.workspaceId));
  skillsList.forEach((skill) => skillsMap.set(skill.id, skill));
  for (const employee of employeesInTeams) {
    const participantId = randomUUID();
    db.insert(assessmentCycleParticipants)
      .values({
        id: participantId,
        cycleId: cycle.id,
        employeeId: employee.id,
        selfStatus: "not_started",
        managerStatus: "not_assigned",
        finalStatus: "not_started",
        managerEmployeeId: null, // TODO: назначить реального менеджера (тимлида)
      })
      .run();
    const assignments = employeeSkillsRows.filter((row) => row.employeeId === employee.id);
    for (const assignment of assignments) {
      if (!skillsMap.has(assignment.skillId)) continue;
      db.insert(skillAssessments)
        .values({
          id: randomUUID(),
          cycleId: cycle.id,
          employeeId: employee.id,
          skillId: assignment.skillId,
          selfLevel: null,
          managerLevel: null,
          finalLevel: null,
          selfComment: null,
          managerComment: null,
          finalComment: null,
          status: "not_started",
          updatedAt: new Date().toISOString(),
        })
        .run();
    }
  }
}

async function updateSelfParticipantStatus(cycleId: string, employeeId: string) {
  const assessments = await db
    .select()
    .from(skillAssessments)
    .where(and(eq(skillAssessments.cycleId, cycleId), eq(skillAssessments.employeeId, employeeId)));
  const allSubmitted = assessments.every((row) => row.selfLevel !== null);
  const status: (typeof assessmentSelfStatuses)[number] = allSubmitted ? "submitted" : "in_progress";
  db.update(assessmentCycleParticipants)
    .set({ selfStatus: status, updatedAt: new Date().toISOString() })
    .where(and(eq(assessmentCycleParticipants.cycleId, cycleId), eq(assessmentCycleParticipants.employeeId, employeeId)))
    .run();
}

async function updateParticipantFinalStatus(cycleId: string, employeeId: string) {
  const assessments = await db
    .select()
    .from(skillAssessments)
    .where(and(eq(skillAssessments.cycleId, cycleId), eq(skillAssessments.employeeId, employeeId)));
  const allFinalized = assessments.every((row) => row.status === "finalized");
  const status: (typeof assessmentFinalStatuses)[number] = allFinalized ? "completed" : "in_progress";
  db.update(assessmentCycleParticipants)
    .set({ finalStatus: status, managerStatus: allFinalized ? "approved" : "in_progress", updatedAt: new Date().toISOString() })
    .where(and(eq(assessmentCycleParticipants.cycleId, cycleId), eq(assessmentCycleParticipants.employeeId, employeeId)))
    .run();
}

async function markManagerInProgress(cycleId: string, employeeId: string) {
  db.update(assessmentCycleParticipants)
    .set({ managerStatus: "in_progress", updatedAt: new Date().toISOString() })
    .where(and(eq(assessmentCycleParticipants.cycleId, cycleId), eq(assessmentCycleParticipants.employeeId, employeeId)))
    .run();
}

function mapCycle(row: typeof assessmentCycles.$inferSelect, teamIds: string[]): AssessmentCycleDTO {
  return {
    ...row,
    description: row.description ?? null,
    startsAt: row.startsAt ?? null,
    endsAt: row.endsAt ?? null,
    teamIds,
  };
}

function mapSkillAssessment(row: typeof skillAssessments.$inferSelect): SkillAssessmentDTO {
  return {
    ...row,
    selfComment: row.selfComment ?? null,
    managerComment: row.managerComment ?? null,
    finalComment: row.finalComment ?? null,
  };
}

function mapParticipant(row: typeof assessmentCycleParticipants.$inferSelect): AssessmentParticipantDTO {
  return {
    ...row,
    managerEmployeeId: row.managerEmployeeId ?? null,
  };
}

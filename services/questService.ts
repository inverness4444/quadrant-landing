import { and, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { questAssignments, questGoalTypes, questPriorities, quests, questStepProgress, questStepStatuses, questSteps } from "@/drizzle/schema";
import { getWorkspaceRiskOverview } from "@/services/riskService";
import { getWorkspaceSkillMap } from "@/services/skillMapService";
import type {
  QuestAssignmentWithProgressDTO,
  QuestWithStepsDTO,
  StepProgressDTO,
  SuggestedQuestDraftDTO,
} from "@/services/types/quest";

type QuestFilters = {
  status?: string;
  teamId?: string;
  goalType?: string;
};

type CreateQuestInput = {
  workspaceId: string;
  title: string;
  description: string;
  ownerEmployeeId: string;
  relatedTeamId?: string | null;
  goalType: (typeof questGoalTypes)[number];
  priority: (typeof questPriorities)[number];
  status?: (typeof quests.$inferSelect.status);
  templateId?: string | null;
  steps: Array<{
    title: string;
    description: string;
    order: number;
    required: boolean;
    relatedSkillId?: string | null;
    suggestedArtifactsCount?: number | null;
  }>;
};

type UpdateStepProgressInput = {
  questAssignmentId: string;
  stepId: string;
  status: (typeof questStepStatuses)[number];
  notes?: string | null;
};

export async function getWorkspaceQuests(
  workspaceId: string,
  filters: QuestFilters = {},
): Promise<QuestWithStepsDTO[]> {
  const whereParts = [eq(quests.workspaceId, workspaceId)];
  if (filters.status) {
    whereParts.push(eq(quests.status, filters.status as (typeof quests.$inferSelect.status)));
  }
  if (filters.teamId) {
    whereParts.push(eq(quests.relatedTeamId, filters.teamId));
  }
  if (filters.goalType) {
    whereParts.push(eq(quests.goalType, filters.goalType as (typeof questGoalTypes)[number]));
  }
  const where = whereParts.length === 1 ? whereParts[0] : and(...whereParts);
  const questRows = await db.select().from(quests).where(where).orderBy(sql`${quests.createdAt} desc`);
  const ids = questRows.map((row) => row.id);
  if (ids.length === 0) return [];
  const stepRows = await db
    .select()
    .from(questSteps)
    .where(inArray(questSteps.questId, ids))
    .orderBy(questSteps.order);
  const stepsByQuest = new Map<string, typeof stepRows>();
  for (const step of stepRows) {
    const list = stepsByQuest.get(step.questId) ?? [];
    list.push(step);
    stepsByQuest.set(step.questId, list);
  }
  return questRows.map((quest) => ({
    ...quest,
    steps: (stepsByQuest.get(quest.id) ?? []).map(mapStepRow),
  }));
}

export async function getQuestById(
  questId: string,
  workspaceId: string,
): Promise<QuestWithStepsDTO | null> {
  const quest = await db.query.quests.findFirst({ where: and(eq(quests.id, questId), eq(quests.workspaceId, workspaceId)) });
  if (!quest) return null;
  const steps = await db
    .select()
    .from(questSteps)
    .where(eq(questSteps.questId, questId))
    .orderBy(questSteps.order);
  return { ...quest, steps: steps.map(mapStepRow) };
}

export async function createQuest(input: CreateQuestInput): Promise<QuestWithStepsDTO> {
  const questId = randomUUID();
  const status = input.status ?? "draft";
  db.insert(quests)
    .values({
      id: questId,
      workspaceId: input.workspaceId,
      templateId: input.templateId ?? null,
      title: input.title,
      description: input.description,
      status,
      ownerEmployeeId: input.ownerEmployeeId,
      relatedTeamId: input.relatedTeamId ?? null,
      priority: input.priority,
      goalType: input.goalType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .run();
  if (input.steps.length > 0) {
    for (const step of input.steps) {
      db.insert(questSteps)
        .values({
          id: randomUUID(),
          questId,
          title: step.title,
          description: step.description,
          order: step.order,
          required: step.required,
          relatedSkillId: step.relatedSkillId ?? null,
          suggestedArtifactsCount: step.suggestedArtifactsCount ?? null,
        })
        .run();
    }
  }
  return getQuestById(questId, input.workspaceId).then((quest) => quest!) as Promise<QuestWithStepsDTO>;
}

export async function assignQuestToEmployees(input: {
  questId: string;
  employeeIds: string[];
  mentorEmployeeId?: string;
}): Promise<QuestAssignmentWithProgressDTO[]> {
  if (input.employeeIds.length === 0) return [];
  const quest = await db.query.quests.findFirst({ where: eq(quests.id, input.questId) });
  if (!quest) return [];
  const steps = await db.select().from(questSteps).where(eq(questSteps.questId, input.questId));
  const assignments: QuestAssignmentWithProgressDTO[] = [];
  for (const employeeId of input.employeeIds) {
    const assignmentId = randomUUID();
    db.insert(questAssignments)
      .values({
        id: assignmentId,
        questId: input.questId,
        employeeId,
        status: "invited",
        startedAt: null,
        completedAt: null,
        mentorEmployeeId: input.mentorEmployeeId ?? null,
      })
      .run();
    const progress: StepProgressDTO[] = [];
    for (const step of steps) {
      const progressId = randomUUID();
      db.insert(questStepProgress)
        .values({
          id: progressId,
          questAssignmentId: assignmentId,
          stepId: step.id,
          status: "not_started",
          notes: null,
          updatedAt: new Date().toISOString(),
        })
        .run();
      progress.push({
        id: progressId,
        questAssignmentId: assignmentId,
        stepId: step.id,
        status: "not_started",
        notes: null,
        updatedAt: new Date().toISOString(),
      });
    }
    assignments.push({
      id: assignmentId,
      questId: input.questId,
      employeeId,
      status: "invited",
      startedAt: null,
      completedAt: null,
      mentorEmployeeId: input.mentorEmployeeId ?? null,
      steps: progress,
      quest: { ...(quest as QuestWithStepsDTO), steps: steps.map(mapStepRow) },
    });
  }
  return assignments;
}

export async function getAssignmentsForEmployee(
  employeeId: string,
  workspaceId: string,
): Promise<QuestAssignmentWithProgressDTO[]> {
  const questRows = await db.select().from(quests).where(eq(quests.workspaceId, workspaceId));
  if (questRows.length === 0) return [];
  const questMap = new Map(questRows.map((quest) => [quest.id, quest]));
  const assignmentRows = await db
    .select()
    .from(questAssignments)
    .where(and(eq(questAssignments.employeeId, employeeId), inArray(questAssignments.questId, questRows.map((q) => q.id))));
  return hydrateAssignments(assignmentRows, questMap);
}

export async function getAssignmentsForQuest(
  questId: string,
  workspaceId: string,
): Promise<QuestAssignmentWithProgressDTO[]> {
  const quest = await db.query.quests.findFirst({ where: and(eq(quests.id, questId), eq(quests.workspaceId, workspaceId)) });
  if (!quest) return [];
  const assignmentRows = await db.select().from(questAssignments).where(eq(questAssignments.questId, questId));
  return hydrateAssignments(assignmentRows, new Map([[quest.id, quest]]));
}

export async function updateQuestStepProgress(input: UpdateStepProgressInput): Promise<StepProgressDTO | null> {
  const assignment = await db.query.questAssignments.findFirst({
    where: eq(questAssignments.id, input.questAssignmentId),
  });
  if (!assignment) return null;
  const existing = await db.query.questStepProgress.findFirst({
    where: and(eq(questStepProgress.questAssignmentId, input.questAssignmentId), eq(questStepProgress.stepId, input.stepId)),
  });
  if (!existing) return null;
  const now = new Date().toISOString();
  db.update(questStepProgress)
    .set({ status: input.status, notes: input.notes ?? null, updatedAt: now })
    .where(eq(questStepProgress.id, existing.id))
    .run();

  const steps = await db
    .select()
    .from(questStepProgress)
    .where(eq(questStepProgress.questAssignmentId, input.questAssignmentId));
  const stepMeta = await db
    .select({ id: questSteps.id, required: questSteps.required })
    .from(questSteps)
    .where(inArray(questSteps.id, steps.map((step) => step.stepId)));
  const requiredMap = new Map(stepMeta.map((row) => [row.id, Boolean(row.required)]));
  const hasStarted = steps.some((step) => step.status !== "not_started");
  const allRequiredDone = steps.every((progress) => !requiredMap.get(progress.stepId) || progress.status === "done");
  if (hasStarted) {
    db.update(questAssignments)
      .set({
        status: allRequiredDone ? "completed" : "in_progress",
        startedAt: assignment.startedAt ?? now,
        completedAt: allRequiredDone ? now : null,
      })
      .where(eq(questAssignments.id, input.questAssignmentId))
      .run();
  }
  return {
    id: existing.id,
    questAssignmentId: existing.questAssignmentId,
    stepId: existing.stepId,
    status: input.status,
    notes: input.notes ?? null,
    updatedAt: now,
  };
}

export async function suggestQuestsFromRisks(workspaceId: string): Promise<SuggestedQuestDraftDTO[]> {
  const [riskItems, skillMap] = await Promise.all([
    getWorkspaceRiskOverview(workspaceId, 5),
    getWorkspaceSkillMap(workspaceId),
  ]);
  const skillsById = new Map(skillMap.skills.map((skill) => [skill.skillId, skill]));
  const teamsById = new Map(skillMap.teams.map((team) => [team.teamId, team.teamName]));
  return riskItems.map((risk) => {
    const skills = (risk.affectedSkills ?? []).map((skillId) => ({
      skillId,
      name: skillsById.get(skillId)?.name ?? "Навык",
    }));
    const teamName = risk.teamId ? teamsById.get(risk.teamId) ?? "Команда" : "Команда не указана";
    return {
      title: `Квест: снизить риск по ${skills[0]?.name ?? "навыку"}`,
      description: risk.description,
      skills,
      teams: [{ teamId: risk.teamId ?? null, teamName }],
      affectedEmployees: risk.affectedEmployees.map((employee) => ({
        employeeId: employee.employeeId,
        name: employee.name,
      })),
    };
  });
}

function mapStepRow(row: typeof questSteps.$inferSelect) {
  return {
    id: row.id,
    questId: row.questId,
    title: row.title,
    description: row.description,
    order: row.order,
    required: Boolean(row.required),
    relatedSkillId: row.relatedSkillId ?? null,
    suggestedArtifactsCount: row.suggestedArtifactsCount ?? null,
  };
}

async function hydrateAssignments(
  assignmentRows: typeof questAssignments.$inferSelect[],
  questMap: Map<string, typeof quests.$inferSelect>,
): Promise<QuestAssignmentWithProgressDTO[]> {
  if (assignmentRows.length === 0) return [];
  const assignmentIds = assignmentRows.map((row) => row.id);
  const progressRows = await db.select().from(questStepProgress).where(inArray(questStepProgress.questAssignmentId, assignmentIds));
  const steps = await db
    .select()
    .from(questSteps)
    .where(inArray(questSteps.questId, assignmentRows.map((a) => a.questId)));
  const progressByAssignment = new Map<string, StepProgressDTO[]>();
  for (const progress of progressRows) {
    const list = progressByAssignment.get(progress.questAssignmentId) ?? [];
    list.push({
      id: progress.id,
      questAssignmentId: progress.questAssignmentId,
      stepId: progress.stepId,
      status: progress.status,
      notes: progress.notes ?? null,
      updatedAt: progress.updatedAt,
    });
    progressByAssignment.set(progress.questAssignmentId, list);
  }
  return assignmentRows.map((assignment) => {
    const quest = questMap.get(assignment.questId);
    const questStepsMapped = quest ? steps.filter((step) => step.questId === quest.id).map(mapStepRow) : [];
    return {
      ...assignment,
      steps: progressByAssignment.get(assignment.id) ?? [],
      quest: quest
        ? ({
            ...quest,
            steps: questStepsMapped,
          } as QuestWithStepsDTO)
        : undefined,
    };
  });
}

import { randomUUID } from "crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  developmentGoalCheckins,
  developmentGoals,
  type DevelopmentGoal,
  type DevelopmentGoalCheckin,
} from "@/drizzle/schema";
import { db } from "@/lib/db";
import { createNotification } from "@/services/notificationService";

type GoalStatus = "active" | "completed" | "archived";

export async function createOrUpdateGoal(input: {
  workspaceId: string;
  employeeId: string;
  title: string;
  description?: string;
  status?: GoalStatus;
  priority?: number;
  dueDate?: string | null;
  targetSkillCode?: string | null;
  targetLevel?: number | null;
  roleProfileId?: string | null;
  goalId?: string;
  createdBy: string;
}): Promise<DevelopmentGoal> {
  const now = new Date().toISOString();
  const goalId = input.goalId ?? randomUUID();
  const status = input.status ?? "active";
  if (!input.goalId) {
    db.insert(developmentGoals)
      .values({
        id: goalId,
        workspaceId: input.workspaceId,
        employeeId: input.employeeId,
        title: input.title,
        description: input.description ?? null,
        status,
        priority: input.priority ?? 2,
        dueDate: input.dueDate ?? null,
        targetSkillCode: input.targetSkillCode ?? null,
        targetLevel: input.targetLevel ?? null,
        roleProfileId: input.roleProfileId ?? null,
        createdBy: input.createdBy,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  } else {
    const existing = await db.query.developmentGoals.findFirst({
      where: (fields, { and, eq }) => and(eq(fields.id, input.goalId!), eq(fields.workspaceId, input.workspaceId)),
    });
    if (!existing) {
      throw new Error("GOAL_NOT_FOUND");
    }
    db.update(developmentGoals)
      .set({
        title: input.title,
        description: input.description ?? null,
        status,
        priority: input.priority ?? existing.priority,
        dueDate: input.dueDate ?? null,
        targetSkillCode: input.targetSkillCode ?? null,
        targetLevel: input.targetLevel ?? null,
        roleProfileId: input.roleProfileId ?? null,
        updatedAt: now,
      })
      .where(and(eq(developmentGoals.id, input.goalId), eq(developmentGoals.workspaceId, input.workspaceId)))
      .run();
  }
  const goal = await db.query.developmentGoals.findFirst({
    where: (fields, { and, eq }) => and(eq(fields.id, goalId), eq(fields.workspaceId, input.workspaceId)),
  });
  if (!goal) {
    throw new Error("GOAL_SAVE_FAILED");
  }
  if (goal.status === "active" && goal.dueDate && new Date(goal.dueDate) < new Date()) {
    await createNotification({
      workspaceId: input.workspaceId,
      userId: input.createdBy,
      type: "development_goal_due",
      title: "Цель просрочена",
      body: `Цель «${goal.title}» просрочена. Обновите срок или завершите её.`,
      entityType: "goal",
      entityId: goal.id,
      url: `/app/development-goals/${goal.id}`,
      priority: 1,
    });
  }
  return goal;
}

export async function addCheckin(input: {
  workspaceId: string;
  employeeId: string;
  goalId: string;
  createdBy: string;
  note: string;
  status?: string | null;
}): Promise<DevelopmentGoalCheckin> {
  const goal = await db.query.developmentGoals.findFirst({
    where: (fields, { and, eq }) =>
      and(eq(fields.id, input.goalId), eq(fields.workspaceId, input.workspaceId), eq(fields.employeeId, input.employeeId)),
  });
  if (!goal) {
    throw new Error("GOAL_NOT_FOUND");
  }
  const id = randomUUID();
  const now = new Date().toISOString();
  db.insert(developmentGoalCheckins)
    .values({
      id,
      goalId: input.goalId,
      workspaceId: input.workspaceId,
      employeeId: input.employeeId,
      createdBy: input.createdBy,
      createdAt: now,
      note: input.note,
      status: input.status ?? null,
    })
    .run();
  db.update(developmentGoals)
    .set({ updatedAt: now })
    .where(and(eq(developmentGoals.id, input.goalId), eq(developmentGoals.workspaceId, input.workspaceId)))
    .run();
  const checkin = await db.query.developmentGoalCheckins.findFirst({ where: eq(developmentGoalCheckins.id, id) });
  if (!checkin) {
    throw new Error("CHECKIN_SAVE_FAILED");
  }
  return checkin;
}

export async function getGoalsForEmployee(input: {
  workspaceId: string;
  employeeId: string;
  includeCheckins?: boolean;
  onlyActive?: boolean;
}): Promise<{ goals: (DevelopmentGoal & { checkins?: DevelopmentGoalCheckin[] })[] }> {
  const where = input.onlyActive
    ? and(eq(developmentGoals.workspaceId, input.workspaceId), eq(developmentGoals.employeeId, input.employeeId), eq(developmentGoals.status, "active"))
    : and(eq(developmentGoals.workspaceId, input.workspaceId), eq(developmentGoals.employeeId, input.employeeId));
  const goals = await db.select().from(developmentGoals).where(where).orderBy(desc(developmentGoals.createdAt));
  if (!input.includeCheckins) {
    return { goals };
  }
  const goalIds = goals.map((g) => g.id);
  const checkins = goalIds.length
    ? await db.select().from(developmentGoalCheckins).where(inArray(developmentGoalCheckins.goalId, goalIds)).orderBy(desc(developmentGoalCheckins.createdAt))
    : [];
  const byGoal = new Map<string, DevelopmentGoalCheckin[]>();
  checkins.forEach((c) => {
    const list = byGoal.get(c.goalId) ?? [];
    list.push(c);
    byGoal.set(c.goalId, list);
  });
  return {
    goals: goals.map((g) => ({
      ...g,
      checkins: byGoal.get(g.id) ?? [],
    })),
  };
}

export async function markGoalCompleted(input: { workspaceId: string; goalId: string; completedBy: string }): Promise<DevelopmentGoal> {
  const existing = await db.query.developmentGoals.findFirst({
    where: (fields, { and, eq }) => and(eq(fields.id, input.goalId), eq(fields.workspaceId, input.workspaceId)),
  });
  if (!existing) {
    throw new Error("GOAL_NOT_FOUND");
  }
  const now = new Date().toISOString();
  db.update(developmentGoals)
    .set({ status: "completed", updatedAt: now })
    .where(eq(developmentGoals.id, input.goalId))
    .run();
  const updated = await db.query.developmentGoals.findFirst({ where: eq(developmentGoals.id, input.goalId) });
  if (!updated) {
    throw new Error("GOAL_NOT_FOUND");
  }
  return updated;
}

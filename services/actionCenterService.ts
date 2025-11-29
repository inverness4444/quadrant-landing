import { and, eq, gte, lte, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  feedbackResponses,
  feedbackSurveys,
  oneOnOnes,
  programOutcomes,
  workspaceOnboardingState,
  workspacePrograms,
  quarterlyReports,
} from "@/drizzle/schema";
import { ActionItem } from "@/services/types/actionCenter";
import { getSkillGapOverview } from "@/services/analyticsService";

function toISO(date: Date) {
  return date.toISOString();
}

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function priorityByDate(date: string | null) {
  if (!date) return "medium" as const;
  const diff = new Date(date).getTime() - Date.now();
  if (diff < 0) return "high" as const;
  const days = diff / (1000 * 60 * 60 * 24);
  if (days <= 3) return "high" as const;
  if (days <= 14) return "medium" as const;
  return "low" as const;
}

export async function getManagerActions(input: { workspaceId: string; managerId: string }): Promise<ActionItem[]> {
  const actions: ActionItem[] = [];
  const nowIso = new Date().toISOString();

  // 1:1 ближайшие 7 дней
  const upcomingOneOnOnes = await db
    .select()
    .from(oneOnOnes)
    .where(
      and(
        eq(oneOnOnes.workspaceId, input.workspaceId),
        eq(oneOnOnes.managerId, input.managerId),
        gte(oneOnOnes.scheduledAt, nowIso),
        lte(oneOnOnes.scheduledAt, toISO(daysFromNow(7))),
      ),
    );
  upcomingOneOnOnes.forEach((meeting) => {
    actions.push({
      id: `1on1:${meeting.id}`,
      workspaceId: input.workspaceId,
      type: "run_1_1",
      title: "Проведите 1:1",
      description: "Запланированная встреча с сотрудником, добавьте заметки после созвона.",
      priority: priorityByDate(meeting.scheduledAt),
      dueDate: meeting.scheduledAt,
      targetScope: "employee",
      targetId: meeting.employeeId,
      link: `/app/one-on-ones/${meeting.id}`,
      createdAt: meeting.createdAt ?? nowIso,
      source: "system",
    });
  });

  // Программы менеджера
  const programs = await db
    .select()
    .from(workspacePrograms)
    .where(and(eq(workspacePrograms.workspaceId, input.workspaceId), eq(workspacePrograms.ownerId, input.managerId)));
  const programIds = programs.map((p) => p.id);
  const outcomes = programIds.length
    ? await db
        .select()
        .from(programOutcomes)
        .where(and(eq(programOutcomes.workspaceId, input.workspaceId), inArray(programOutcomes.programId, programIds)))
    : [];

  programs.forEach((p) => {
    const hasOutcome = outcomes.some((o) => o.programId === p.id);
    if (p.status === "draft") {
      actions.push({
        id: `program:launch:${p.id}`,
        workspaceId: input.workspaceId,
        type: "launch_program",
        title: `Запустите программу «${p.name}»`,
        description: "Программа в черновике. Запустите, чтобы команда получила цели, опросы и пилоты.",
        priority: "medium",
        dueDate: p.plannedEndAt ?? null,
        targetScope: "program",
        targetId: p.id,
        link: `/app/programs/${p.id}`,
        createdAt: p.createdAt,
        source: "program",
      });
    }
    if (p.status === "active" && p.plannedEndAt) {
      actions.push({
        id: `program:close:${p.id}`,
        workspaceId: input.workspaceId,
        type: "close_program",
        title: `Подведите итоги программы «${p.name}»`,
        description: "Срок завершения близко. Закройте программу и оформите итоги.",
        priority: priorityByDate(p.plannedEndAt),
        dueDate: p.plannedEndAt,
        targetScope: "program",
        targetId: p.id,
        link: `/app/programs/${p.id}`,
        createdAt: p.createdAt,
        source: "program",
      });
    }
    if (p.status === "completed" && !hasOutcome) {
      actions.push({
        id: `program:outcome:${p.id}`,
        workspaceId: input.workspaceId,
        type: "fill_program_outcome",
        title: `Оформите итоги программы «${p.name}»`,
        description: "Заполните краткое резюме, метрики и рекомендации.",
        priority: "high",
        dueDate: p.actualEndAt ?? p.plannedEndAt ?? null,
        targetScope: "program",
        targetId: p.id,
        link: `/app/programs/${p.id}#outcomes`,
        createdAt: p.updatedAt ?? p.createdAt,
        source: "program",
      });
    }
  });

  // Активные опросы, где менеджер респондент и не ответил
  const activeSurveys = await db
    .select()
    .from(feedbackSurveys)
    .where(and(eq(feedbackSurveys.workspaceId, input.workspaceId), eq(feedbackSurveys.status, "active")));
  if (activeSurveys.length) {
    const responses = await db
      .select()
      .from(feedbackResponses)
      .where(
        and(
          eq(feedbackResponses.workspaceId, input.workspaceId),
          eq(feedbackResponses.respondentId, input.managerId),
        ),
      );
    activeSurveys.forEach((survey) => {
      const resp = responses.find((r) => r.surveyId === survey.id);
      if (!resp || resp.status !== "submitted") {
        actions.push({
          id: `survey:${survey.id}`,
          workspaceId: input.workspaceId,
          type: "answer_survey",
          title: `Заполните опрос: ${survey.title}`,
          description: "Ответьте, чтобы повысить вовлечённость команды.",
          priority: "medium",
          dueDate: survey.endDate ?? null,
          targetScope: "report",
          targetId: survey.id,
          link: resp ? `/app/feedback/respond/${resp.id}` : `/app/feedback/surveys/${survey.id}`,
          createdAt: survey.createdAt,
          source: "feedback",
        });
      }
    });
  }

  return actions;
}

export async function getHRActions(input: { workspaceId: string; hrId: string }): Promise<ActionItem[]> {
  const actions: ActionItem[] = [];
  const nowIso = new Date().toISOString();

  // Онбординг не завершён
  const onboarding = await db
    .select()
    .from(workspaceOnboardingState)
    .where(eq(workspaceOnboardingState.workspaceId, input.workspaceId));
  if (onboarding[0] && !onboarding[0].isCompleted) {
    actions.push({
      id: `onboarding:${input.workspaceId}`,
      workspaceId: input.workspaceId,
      type: "finish_onboarding",
      title: "Завершите настройку Quadrant",
      description: "Пройдите мастер /app/setup, чтобы открыть все разделы.",
      priority: "high",
      dueDate: null,
      targetScope: "company",
      targetId: input.workspaceId,
      link: "/app/setup",
      createdAt: onboarding[0].lastUpdatedAt,
      source: "onboarding",
    });
  }

  // Skill gap низкое покрытие
  const skillGap = await getSkillGapOverview(input.workspaceId);
  if (skillGap.percentSatisfied < 80 || skillGap.missingRatings > 0) {
    actions.push({
      id: `skillgap:${input.workspaceId}`,
      workspaceId: input.workspaceId,
      type: "launch_program_for_gap",
      title: "Закройте критичные skill gaps",
      description: "Настройте требования по ролям и запустите программу развития.",
      priority: skillGap.percentSatisfied < 60 ? "high" : "medium",
      dueDate: null,
      targetScope: "company",
      targetId: input.workspaceId,
      link: "/app/skills",
      createdAt: nowIso,
      source: "skill_gap",
    });
  }

  // Квартальные отчёты: если нет отчёта за текущий квартал
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
  const report = await db
    .select()
    .from(quarterlyReports)
    .where(
      and(
        eq(quarterlyReports.workspaceId, input.workspaceId),
        eq(quarterlyReports.year, currentYear),
        eq(quarterlyReports.quarter, currentQuarter),
      ),
    );
  if (report.length === 0) {
    actions.push({
      id: `report:${currentYear}q${currentQuarter}`,
      workspaceId: input.workspaceId,
      type: "report",
      title: `Соберите квартальный отчёт Q${currentQuarter} ${currentYear}`,
      description: "Обновите метрики талантов, пилотов и вовлечённости.",
      priority: "medium",
      dueDate: null,
      targetScope: "report",
      targetId: null,
      link: "/app/reports/quarterly",
      createdAt: nowIso,
      source: "system",
    });
  }

  return actions;
}

export async function getOwnerActions(input: { workspaceId: string; ownerId: string }) {
  const ownerActions = await getHRActions({ workspaceId: input.workspaceId, hrId: input.ownerId });
  return ownerActions;
}

export async function getActionCenter(input: {
  workspaceId: string;
  userId: string;
  roleFlags: { isOwner: boolean; isAdmin: boolean; isHR: boolean; isManager: boolean };
}) {
  const lists: ActionItem[][] = [];
  if (input.roleFlags.isOwner || input.roleFlags.isAdmin || input.roleFlags.isHR) {
    lists.push(await getHRActions({ workspaceId: input.workspaceId, hrId: input.userId }));
  }
  if (input.roleFlags.isManager) {
    lists.push(await getManagerActions({ workspaceId: input.workspaceId, managerId: input.userId }));
  }
  const merged: ActionItem[] = [];
  const seen = new Set<string>();
  lists.flat().forEach((item) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    merged.push(item);
  });
  return merged.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
}

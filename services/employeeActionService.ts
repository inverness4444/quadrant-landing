import { addDays } from "date-fns";
import type { EmployeeProfileSnapshot } from "@/services/employeeProfileService";
import { getEmployeeProfileSnapshot } from "@/services/employeeProfileService";

export type EmployeeActionItem = {
  id: string;
  type: "finish_goal" | "start_goal" | "prepare_1_1" | "answer_survey" | "check_skill_gap" | "read_program_outcome";
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  link: string;
  dueDate: string | null;
};

export async function getEmployeeActions(input: { workspaceId: string; employeeId: string; profile?: EmployeeProfileSnapshot }): Promise<EmployeeActionItem[]> {
  const profile = input.profile ?? (await getEmployeeProfileSnapshot({ workspaceId: input.workspaceId, employeeId: input.employeeId }));
  const actions: EmployeeActionItem[] = [];
  const now = new Date();

  const overdueGoals = profile.goals.filter((g) => g.status === "overdue");
  overdueGoals.forEach((goal) =>
    actions.push({
      id: `goal:overdue:${goal.id}`,
      type: "finish_goal",
      title: `Обновите цель «${goal.title}»`,
      description: "Срок истёк. Обсудите с менеджером и скорректируйте план.",
      priority: "high",
      link: `/app/development-goals/${goal.id}`,
      dueDate: goal.targetDate,
    }),
  );

  const hasActiveGoals = profile.goals.some((g) => g.status === "active");
  if (!hasActiveGoals && profile.skills.topGaps.length > 0) {
    const skill = profile.skills.topGaps[0];
    actions.push({
      id: `goal:start:${skill.skillId}`,
      type: "start_goal",
      title: `Создайте цель по навыку ${skill.skillName}`,
      description: "У вас есть разрыв по этому навыку. Добавьте цель развития.",
      priority: "medium",
      link: `/app/employees/${profile.employeeId}/skills-gap`,
      dueDate: addDays(now, 7).toISOString(),
    });
  }

  const upcomingOneOnOne = profile.upcomingOneOnOnes[0];
  if (upcomingOneOnOne) {
    actions.push({
      id: `1on1:${upcomingOneOnOne.id}`,
      type: "prepare_1_1",
      title: `Подготовьтесь к 1:1 с ${upcomingOneOnOne.withName}`,
      description: "Запишите вопросы и успехи, чтобы встреча была продуктивной.",
      priority: "medium",
      link: `/app/one-on-ones/${upcomingOneOnOne.id}`,
      dueDate: upcomingOneOnOne.scheduledAt,
    });
  }

  profile.feedback.pendingSurveys.forEach((survey) =>
    actions.push({
      id: `survey:${survey.id}`,
      type: "answer_survey",
      title: `Пройдите опрос «${survey.title}»`,
      description: "Ответы помогают улучшать культуру и процессы.",
      priority: "medium",
      link: `/app/feedback/surveys/${survey.id}`,
      dueDate: survey.dueDate,
    }),
  );

  if (profile.programs.some((p) => p.status === "completed")) {
    const program = profile.programs.find((p) => p.status === "completed");
    if (program) {
      actions.push({
        id: `program:outcome:${program.id}`,
        type: "read_program_outcome",
        title: `Посмотрите итоги программы «${program.name}»`,
        description: "Узнайте, какие выводы и рекомендации предложены.",
        priority: "low",
        link: `/app/programs/${program.id}#outcomes`,
        dueDate: null,
      });
    }
  }

  return actions;
}


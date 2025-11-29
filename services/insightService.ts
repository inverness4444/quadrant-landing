import type { GrowthPathSuggestion } from "@/services/types/analytics";
import type {
  EmployeeProfile,
  EmployeeSkillStat,
  InsightItem,
  TeamMemberSummary,
  TeamSkillStat,
} from "@/services/types/profile";

type TeamInsightInput = {
  teamName: string;
  members: TeamMemberSummary[];
  riskySkills: TeamSkillStat[];
  artifactCount: number;
  skillCount: number;
  headcount: number;
};

export function buildTeamInsights(input: TeamInsightInput): InsightItem[] {
  const insights: InsightItem[] = [];
  for (const skill of input.riskySkills.slice(0, 3)) {
    insights.push({
      id: `team-risk-${skill.skillId}`,
      kind: "risk",
      text: `Навык «${skill.name}» в команде ${input.teamName} держится на ${skill.owners} человек — нужен план передачи знаний.`,
    });
  }
  const singlePoints = input.members.filter((member) => member.isSinglePoint);
  if (singlePoints.length > 0) {
    const names = singlePoints.slice(0, 2).map((member) => member.name).join(", ");
    insights.push({
      id: "team-single-points",
      kind: "risk",
      text: `${names}${singlePoints.length > 2 ? " и другие" : ""} — единственные владельцы критичных навыков. Назначьте дублёров.`,
    });
  }
  if (input.artifactCount === 0) {
    insights.push({
      id: "team-artifacts-missing",
      kind: "workload",
      text: "Quadrant не видит артефактов команды — подключите GitHub/Jira, чтобы отслеживать реальные задачи.",
    });
  } else if (input.artifactCount < input.headcount) {
    insights.push({
      id: "team-artifacts-low",
      kind: "workload",
      text: "На команду приходится мало видимых артефактов — проверьте корректность интеграций и статусов задач.",
    });
  }
  if (input.skillCount / Math.max(1, input.headcount) < 2) {
    insights.push({
      id: "team-skill-diversity",
      kind: "info",
      text: "Навыковая карта бедная — добавьте оценки по ключевым компетенциям, чтобы видеть реальную картину.",
    });
  }
  return insights.slice(0, 5);
}

type EmployeeInsightInput = {
  employeeName: string;
  stats: EmployeeProfile["stats"];
  riskProfile: EmployeeProfile["riskProfile"];
  growth: GrowthPathSuggestion[];
  skills: EmployeeSkillStat[];
};

export function buildEmployeeInsights(input: EmployeeInsightInput): InsightItem[] {
  const insights: InsightItem[] = [];
  if (input.stats.isSinglePoint && input.riskProfile?.criticalSkills.length) {
    insights.push({
      id: "employee-critical-owner",
      kind: "risk",
      text: `${input.employeeName} тянет критичные навыки (${input.riskProfile.criticalSkills.length}). Запланируйте передачу знаний.`,
    });
  }
  if (input.stats.recentArtifacts < 3) {
    insights.push({
      id: "employee-artifacts-low",
      kind: "workload",
      text: `${input.employeeName} почти не засветился в артефактах за последние недели — дайте задачи, подтверждающие навыки.`,
    });
  }
  if (input.growth.length > 0) {
    const path = input.growth[0];
    if (path.missingSkills.length > 0) {
      const missing = path.missingSkills.slice(0, 2).map((skill) => skill.name).join(", ");
      insights.push({
        id: `employee-growth-${path.targetRoleId}`,
        kind: "growth",
        text: `Для роли «${path.targetRoleName}» не хватает: ${missing}. Добавьте эти компетенции в план развития.`,
      });
    } else {
      insights.push({
        id: `employee-ready-${path.targetRoleId}`,
        kind: "info",
        text: `${input.employeeName} почти готов к роли «${path.targetRoleName}». Рассмотрите переход.`,
      });
    }
  }
  const lowSkills = input.skills.filter((skill) => skill.level <= 2).slice(0, 2);
  if (lowSkills.length > 0) {
    const label = lowSkills.map((skill) => skill.name).join(", ");
    insights.push({
      id: "employee-skill-gap",
      kind: "growth",
      text: `Стоит усилить навыки: ${label}. Сейчас уровень ≤2/5.`,
    });
  }
  return insights.slice(0, 5);
}

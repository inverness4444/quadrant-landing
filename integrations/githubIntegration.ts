import { listEmployees } from "@/repositories/employeeRepository";
import { listSkills } from "@/repositories/skillRepository";
import type { DemoArtifactPayload, IntegrationClient } from "@/integrations/baseIntegration";

function pickRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function pickSkills(skillIds: string[], count: number) {
  const shuffled = [...skillIds].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.max(1, count)).map((id, index) => ({
    skillId: id,
    weight: Math.max(1, 5 - index),
  }));
}

const sampleTitles = [
  { title: "PR: Refactor billing service", description: "Обновление пайплайна расчёта выручки" },
  { title: "PR: Improve onboarding flow", description: "Оптимизация фичи приглашений" },
  { title: "PR: Analytics dashboards", description: "Добавление графиков в административную панель" },
  { title: "Code Review: Observability setup", description: "Ревью интеграции с мониторингом" },
];

export class GithubIntegrationClient implements IntegrationClient {
  readonly type = "github";

  async syncDemoArtifacts({ workspaceId }: { workspaceId: string }): Promise<DemoArtifactPayload[]> {
    const [employees, skills] = await Promise.all([listEmployees(workspaceId), listSkills(workspaceId)]);
    if (employees.length === 0 || skills.length === 0) {
      return [];
    }
    const skillIds = skills.map((skill) => skill.id);
    const artifacts: DemoArtifactPayload[] = [];
    for (let i = 0; i < Math.min(4, employees.length); i += 1) {
      const employee = employees[i];
      const sample = sampleTitles[i % sampleTitles.length];
      artifacts.push({
        employeeId: employee.id,
        type: "code",
        title: sample.title,
        description: sample.description,
        link: `https://github.com/example/repo/pull/${100 + i}`,
        skills: pickSkills(skillIds, 2),
      });
    }
    if (artifacts.length === 0) {
      const employee = pickRandom(employees);
      artifacts.push({
        employeeId: employee.id,
        type: "code",
        title: sampleTitles[0].title,
        description: sampleTitles[0].description,
        link: "https://github.com/example/repo/pull/101",
        skills: pickSkills(skillIds, 2),
      });
    }
    return artifacts;
  }
}

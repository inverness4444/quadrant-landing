import { listEmployees } from "@/repositories/employeeRepository";
import { listSkills } from "@/repositories/skillRepository";
import type { DemoArtifactPayload, IntegrationClient } from "@/integrations/baseIntegration";

const samplePullRequests = [
  { title: "PR: Refactor billing service", summary: "Обновление пайплайна расчёта выручки" },
  { title: "PR: Improve onboarding flow", summary: "Оптимизация фичи приглашений" },
  { title: "PR: Analytics dashboards", summary: "Добавление графиков в административную панель" },
  { title: "PR: Observability rollout", summary: "Добавление метрик и алёртов" },
  { title: "PR: Feature flags SDK", summary: "Общий клиент для feature flag платформы" },
  { title: "PR: Partner API v2", summary: "Новый контракт API для партнёров" },
];

function buildAssignees(employees: Awaited<ReturnType<typeof listEmployees>>, index: number) {
  if (employees.length === 0) return [];
  const author = employees[index % employees.length];
  const reviewer = employees[(index + 1) % employees.length];
  const reviewerTwo = employees[(index + 3) % employees.length];
  const assignees = [{ employeeId: author.id, role: "author" as const }];
  if (reviewer && reviewer.id !== author.id) {
    assignees.push({ employeeId: reviewer.id, role: "reviewer" as const });
  }
  if (reviewerTwo && reviewerTwo.id !== author.id && reviewerTwo.id !== reviewer.id) {
    assignees.push({ employeeId: reviewerTwo.id, role: "reviewer" as const });
  }
  return assignees;
}

function pickSkills(skillIds: string[], count: number) {
  if (skillIds.length === 0) return [];
  const shuffled = [...skillIds].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.max(1, count)).map((id, idx) => ({
    skillId: id,
    confidence: Math.max(0.4, 1 - idx * 0.2),
  }));
}

export class GithubIntegrationClient implements IntegrationClient {
  readonly type = "github";

  async syncDemoArtifacts({ workspaceId }: { workspaceId: string }): Promise<DemoArtifactPayload[]> {
    const [employees, skills] = await Promise.all([listEmployees(workspaceId), listSkills(workspaceId)]);
    if (employees.length === 0 || skills.length === 0) {
      return [];
    }
    const skillIds = skills.map((skill) => skill.id);
    const artifacts: DemoArtifactPayload[] = [];
    const prCount = Math.min(6, Math.max(3, employees.length));
    for (let i = 0; i < prCount; i += 1) {
      const sample = samplePullRequests[i % samplePullRequests.length];
      const createdAt = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString();
      artifacts.push({
        externalId: `PR-${120 + i}`,
        type: "pull_request",
        title: sample.title,
        summary: sample.summary,
        url: `https://github.com/example/quadrant/pull/${120 + i}`,
        createdAt,
        updatedAt: createdAt,
        assignees: buildAssignees(employees, i),
        skills: pickSkills(skillIds, 2),
      });
    }
    return artifacts;
  }
}

import { listEmployees } from "@/repositories/employeeRepository";
import { listSkills } from "@/repositories/skillRepository";
import type { DemoArtifactPayload, IntegrationClient } from "@/integrations/baseIntegration";

const jiraSamples = [
  { title: "JIRA-241: Improve login stability", description: "Фикс багов в процессе авторизации" },
  { title: "JIRA-355: Feature flag rollout", description: "Подготовка прогрессивного включения фичи" },
  { title: "JIRA-412: CRM sync optimisation", description: "Ускорение выгрузок в CRM" },
  { title: "JIRA-518: Billing SLA dashboard", description: "Создание метрик для контроля SLA" },
];

function randomWeights(skillIds: string[]) {
  const chosen = skillIds.sort(() => Math.random() - 0.5).slice(0, Math.min(2, skillIds.length));
  return chosen.map((id, index) => ({ skillId: id, weight: 3 - index }));
}

export class JiraIntegrationClient implements IntegrationClient {
  readonly type = "jira";

  async syncDemoArtifacts({ workspaceId }: { workspaceId: string }): Promise<DemoArtifactPayload[]> {
    const [employees, skills] = await Promise.all([listEmployees(workspaceId), listSkills(workspaceId)]);
    if (employees.length === 0 || skills.length === 0) {
      return [];
    }
    const skillIds = skills.map((skill) => skill.id);
    return employees.slice(0, Math.min(3, employees.length)).map((employee, index) => {
      const sample = jiraSamples[index % jiraSamples.length];
      return {
        employeeId: employee.id,
        type: "task" as const,
        title: sample.title,
        description: sample.description,
        link: `https://jira.example.com/browse/${sample.title.split(":")[0]}`,
        skills: randomWeights(skillIds),
      };
    });
  }
}

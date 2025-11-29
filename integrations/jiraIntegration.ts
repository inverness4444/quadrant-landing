import { listEmployees } from "@/repositories/employeeRepository";
import { listSkills } from "@/repositories/skillRepository";
import type { DemoArtifactPayload, IntegrationClient } from "@/integrations/baseIntegration";

const jiraSamples = [
  { key: "JIRA-241", summary: "Фикс багов в процессе авторизации" },
  { key: "JIRA-355", summary: "Подготовка прогрессивного включения фичи" },
  { key: "JIRA-412", summary: "Ускорение выгрузок в CRM" },
  { key: "JIRA-518", summary: "Создание метрик для контроля SLA" },
  { key: "JIRA-603", summary: "Оптимизация очередей поддержки" },
];

function selectAssignees(employees: Awaited<ReturnType<typeof listEmployees>>, index: number) {
  if (employees.length === 0) return [];
  const owner = employees[index % employees.length];
  const helper = employees[(index + 2) % employees.length];
  const assignees = [{ employeeId: owner.id, role: "assignee" as const }];
  if (helper && helper.id !== owner.id) {
    assignees.push({ employeeId: helper.id, role: "commenter" as const });
  }
  return assignees;
}

function pickSkillConfidence(skillIds: string[]) {
  if (skillIds.length === 0) return [];
  const shuffled = [...skillIds].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(3, skillIds.length)).map((id, idx) => ({
    skillId: id,
    confidence: Math.max(0.35, 0.85 - idx * 0.2),
  }));
}

export class JiraIntegrationClient implements IntegrationClient {
  readonly type = "jira";

  async syncDemoArtifacts({ workspaceId }: { workspaceId: string }): Promise<DemoArtifactPayload[]> {
    const [employees, skills] = await Promise.all([listEmployees(workspaceId), listSkills(workspaceId)]);
    if (employees.length === 0 || skills.length === 0) {
      return [];
    }
    const skillIds = skills.map((skill) => skill.id);
    const count = Math.min(6, Math.max(3, employees.length));
    const artifacts: DemoArtifactPayload[] = [];
    for (let i = 0; i < count; i += 1) {
      const sample = jiraSamples[i % jiraSamples.length];
      const createdAt = new Date(Date.now() - (i + 1) * 12 * 60 * 60 * 1000).toISOString();
      artifacts.push({
        externalId: sample.key,
        type: "ticket",
        title: `${sample.key}: ${sample.summary}`,
        summary: sample.summary,
        url: `https://jira.example.com/browse/${sample.key}`,
        createdAt,
        updatedAt: createdAt,
        assignees: selectAssignees(employees, i),
        skills: pickSkillConfidence(skillIds),
      });
    }
    return artifacts;
  }
}

import { listEmployees } from "@/repositories/employeeRepository";
import { listSkills } from "@/repositories/skillRepository";
import type { DemoArtifactPayload, IntegrationClient } from "@/integrations/baseIntegration";

const docSamples = [
  { title: "Spec: Onboarding flow 2.0", summary: "Обновлённый сценарий воронки активации" },
  { title: "ADR: Data contracts governance", summary: "Правила документирования контрактов" },
  { title: "Guide: Incident response playbook", summary: "Пошаговые инструкции для on-call" },
  { title: "Research: Product analytics stack", summary: "Анализ метрик и источников" },
];

function buildDocAssignees(employees: Awaited<ReturnType<typeof listEmployees>>, index: number) {
  if (employees.length === 0) return [];
  const author = employees[index % employees.length];
  const reviewer = employees[(index + 2) % employees.length];
  const assignees = [{ employeeId: author.id, role: "author" as const }];
  if (reviewer && reviewer.id !== author.id) {
    assignees.push({ employeeId: reviewer.id, role: "commenter" as const });
  }
  return assignees;
}

function pickDocumentationSkills(skillIds: string[]) {
  if (skillIds.length === 0) return [];
  return skillIds
    .slice(0, Math.min(2, skillIds.length))
    .map((id) => ({ skillId: id, confidence: 0.6 }));
}

export class NotionIntegrationClient implements IntegrationClient {
  readonly type = "notion";

  async syncDemoArtifacts({ workspaceId }: { workspaceId: string }): Promise<DemoArtifactPayload[]> {
    const [employees, skills] = await Promise.all([listEmployees(workspaceId), listSkills(workspaceId)]);
    if (employees.length === 0 || skills.length === 0) {
      return [];
    }
    const skillIds = skills.map((skill) => skill.id);
    const docsCount = Math.min(docSamples.length, Math.max(3, employees.length));
    const artifacts: DemoArtifactPayload[] = [];
    for (let i = 0; i < docsCount; i += 1) {
      const sample = docSamples[i % docSamples.length];
      const createdAt = new Date(Date.now() - (i + 2) * 24 * 60 * 60 * 1000).toISOString();
      artifacts.push({
        externalId: `DOC-${50 + i}`,
        type: "doc",
        title: sample.title,
        summary: sample.summary,
        url: "https://www.notion.so/quadrant/demo",
        createdAt,
        updatedAt: createdAt,
        assignees: buildDocAssignees(employees, i),
        skills: pickDocumentationSkills(skillIds),
      });
    }
    return artifacts;
  }
}

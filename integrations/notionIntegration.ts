import { listEmployees } from "@/repositories/employeeRepository";
import { listSkills } from "@/repositories/skillRepository";
import type { DemoArtifactPayload, IntegrationClient } from "@/integrations/baseIntegration";

const docSamples = [
  { title: "Spec: Onboarding flow 2.0", description: "Обновлённый сценарий воронки активации" },
  { title: "ADR: Data contracts governance", description: "Правила документирования контрактов" },
  { title: "Guide: Incident response playbook", description: "Пошаговые инструкции для on-call" },
];

function selectSkills(skillIds: string[]) {
  return skillIds.slice(0, Math.max(1, Math.min(2, skillIds.length))).map((id) => ({
    skillId: id,
    weight: 2,
  }));
}

export class NotionIntegrationClient implements IntegrationClient {
  readonly type = "notion";

  async syncDemoArtifacts({ workspaceId }: { workspaceId: string }): Promise<DemoArtifactPayload[]> {
    const [employees, skills] = await Promise.all([listEmployees(workspaceId), listSkills(workspaceId)]);
    if (employees.length === 0 || skills.length === 0) {
      return [];
    }
    const skillIds = skills.map((skill) => skill.id);
    return docSamples.slice(0, Math.min(docSamples.length, employees.length)).map((sample, index) => {
      const employee = employees[index % employees.length];
      return {
        employeeId: employee.id,
        type: "doc" as const,
        title: sample.title,
        description: sample.description,
        link: "https://www.notion.so/demo",
        skills: selectSkills(skillIds),
      };
    });
  }
}

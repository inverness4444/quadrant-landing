export type IntegrationType = "github" | "jira" | "notion" | "linear" | "custom";
export type IntegrationStatus = "connected" | "disconnected" | "error";
export type IntegrationConfig = Record<string, unknown>;

export type IntegrationDescriptor = {
  type: IntegrationType;
  displayName: string;
  description: string;
};

export const AVAILABLE_INTEGRATIONS: IntegrationDescriptor[] = [
  {
    type: "github",
    displayName: "GitHub",
    description: "Репозитории кода и pull request’ы команды",
  },
  {
    type: "jira",
    displayName: "Jira",
    description: "Задачи, баги и прогресс продуктовых команд",
  },
  {
    type: "notion",
    displayName: "Notion",
    description: "Документация, спецификации и продуктовые заметки",
  },
  {
    type: "linear",
    displayName: "Linear",
    description: "Быстрый трекинг задач и инициатив",
  },
  {
    type: "custom",
    displayName: "Custom / ручной импорт",
    description: "Любая внутренняя система, куда можно выгрузить JSON/CSV",
  },
];

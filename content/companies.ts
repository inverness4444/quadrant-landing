import type { BenefitCard, CaseStudy, Integration, HeroContent } from "@/types/content";

export const companiesHero: HeroContent = {
  eyebrow: "Для HR и C-level",
  title: "Quadrant для компаний",
  subtitle:
    "Инструмент для объективной оценки навыков и прозрачных грейдов. Видите реальный вклад людей и план развития команды.",
  primaryCta: { label: "Запросить демо", href: "/contact" },
};

export const companyBenefits: BenefitCard[] = [
  {
    title: "Прозрачные грейды и ожидания",
    description: "Грейды описаны через реальные артефакты, а не абстрактные таблицы.",
  },
  {
    title: "Объективные данные",
    description: "Performance-review опирается на код, задачи и документы, а не на субъективные мнения.",
  },
  {
    title: "План развития команды",
    description: "Граф навыков показывает, где есть пробелы и кто уже готов вести других.",
  },
];

export const companyIntegrations: Integration[] = [
  { name: "GitHub" },
  { name: "GitLab" },
  { name: "Jira" },
  { name: "Confluence" },
  { name: "Notion" },
  { name: "Slack" },
];

export const companyCase: CaseStudy = {
  title: "Кейс FinTech Corp",
  summary: [
    "Подключили GitHub и Jira для команды из 80 инженеров.",
    "Нашли потенциальных тимлидов и подготовили планы промо.",
    "Закрыли skill gap по аналитике с понятным обучением.",
  ],
  cta: { label: "Запросить демо", href: "/contact" },
};

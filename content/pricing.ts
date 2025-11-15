import type { PricingPlan } from "@/types/content";

export const pricingPlans: PricingPlan[] = [
  {
    name: "Start",
    audience: "Для команд до 50 человек",
    features: [
      "До 50 пользователей",
      "Поддержка в Slack",
      "Базовые интеграции",
    ],
    note: "Цену уточните у нас",
    ctaLabel: "Запросить предложение",
  },
  {
    name: "Growth",
    audience: "Для растущих компаний",
    features: [
      "До 250 пользователей",
      "Выделенный менеджер",
      "Расширенные интеграции и отчёты",
    ],
    note: "Цену уточните у нас",
    ctaLabel: "Получить предложение",
  },
  {
    name: "Enterprise",
    audience: "Для крупных организаций",
    features: [
      "500+ пользователей",
      "SLA и кастомные интеграции",
      "On-premise / частное облако",
    ],
    note: "Цену уточните у нас",
    ctaLabel: "Связаться с нами",
  },
];

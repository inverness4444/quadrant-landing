import { caseStudies } from "@/content/cases";
import type {
  AudienceColumn,
  HeroContent,
  SearchConfig,
  Step,
  Track,
  CTA,
} from "@/types/content";

export const homeHero: HeroContent = {
  eyebrow: "карта навыков",
  title: "Quadrant — живая карта навыков вашей команды",
  subtitle:
    "Мы анализируем реальные артефакты работы (код, документы, задачи) и строим граф навыков, чтобы компании видели, кто чем реально силён.",
  primaryCta: { label: "Запросить демо", href: "/contact" },
  secondaryCta: { label: "Узнать, как это работает", href: "/platform" },
  caption: "Для продуктовых команд, IT, консалтинга и быстрорастущих компаний.",
};

export const searchConfig: SearchConfig = {
  placeholder: "Найти навыки, роли или трек развития…",
  tags: ["Разработка", "Аналитика", "Продакт-менеджмент", "Дизайн", "Data"],
};

export const trackCards: Track[] = [
  {
    id: "track-1",
    title: "Трек: Middle Backend Engineer → Senior",
    description:
      "Отслеживаем код-ревью, участие в RFC, влияние на архитектуру и стабильность сервисов.",
    tags: ["Разработка", "Backend", "Golang", "PostgreSQL"],
  },
  {
    id: "track-2",
    title: "Трек: Аналитик → Продакт-менеджер",
    description:
      "Смотрим на постановку задач в Jira, эксперименты и продуктовые решения в документации.",
    tags: ["Аналитика", "Продакт-менеджмент", "Data"],
  },
  {
    id: "track-3",
    title: "Трек: UX Researcher → Product Design Lead",
    description:
      "Анализируем исследования, дизайн-систему и то, как решения влияют на бизнес-метрики.",
    tags: ["Дизайн", "Продакт-менеджмент"],
  },
  {
    id: "track-4",
    title: "Трек: Junior Frontend → Middle",
    description:
      "Отмечаем архитектуру интерфейсов, качество merge-request и работу с дизайном.",
    tags: ["Разработка", "Frontend", "React"],
  },
  {
    id: "track-5",
    title: "Трек: Data Scientist → Senior",
    description:
      "Контролируем качество моделей, участие в MLOps и документирование экспериментов.",
    tags: ["Data", "ML", "Python"],
  },
];

export const audienceColumns: AudienceColumn[] = [
  {
    title: "Для компаний",
    points: [
      "Понимание реальных навыков",
      "Объективный рост по артефактам",
      "Прозрачные карьерные треки",
    ],
    cta: { label: "Подробнее для компаний", href: "/companies", variant: "primary" },
  },
  {
    title: "Для специалистов",
    points: [
      "Видно, за что растёшь",
      "Прозрачные ожидания по уровням",
      "Реальные артефакты вместо красивого резюме",
    ],
    cta: {
      label: "Подробнее для специалистов",
      href: "/talents",
      variant: "secondary",
    },
  },
];

export const processSteps: Step[] = [
  {
    title: "Подключаем ваши системы",
    description: "Git, таск-трекер, документы. Забираем только разрешённые данные.",
  },
  {
    title: "Строим граф навыков и ролей",
    description:
      "Quadrant связывает людей с навыками и показывает, кто готов к следующему уровню.",
  },
  {
    title: "Связываем навыки с грейдами",
    description:
      "Грейды становятся прозрачными, видно вклад в performance-review и планы развития.",
  },
];

export const heroHighlights: string[] = [
  "200–5000 сотрудников",
  "Пилот 30–90 дней",
  "Гильдийная модель",
];

export const homeCta: { title: string; subtitle: string; actions: CTA[] } = {
  title: "Хотите увидеть Quadrant на вашей команде?",
  subtitle: "Подключим пилот, покажем граф навыков и план развития по вашим артефактам.",
  actions: [
    { label: "Попробовать Quadrant", href: "/auth/register", variant: "primary" },
    { label: "Войти", href: "/auth/login", variant: "secondary" },
  ],
};

export const homeSections = {
  search: {
    eyebrow: "Поиск навыков",
    title: "Найдите трек развития по роли или навыку",
    subtitle:
      "Quadrant показывает, какие компетенции нужно усилить, чтобы перейти на новый уровень.",
  },
  audience: {
    eyebrow: "Для кого",
    title: "Для компаний и специалистов",
    subtitle: "Одна платформа для честного роста и прозрачных ожиданий.",
  },
  process: {
    eyebrow: "Процесс",
    title: "Как это работает",
    subtitle:
      "Три шага, чтобы построить живую карту навыков без бесконечных таблиц.",
  },
  faq: {
    eyebrow: "FAQ",
    title: "Частые вопросы",
    subtitle: "Если нужно больше деталей, напишите нам — покажем демо Quadrant.",
  },
};

export const homeCases = caseStudies.slice(0, 3);

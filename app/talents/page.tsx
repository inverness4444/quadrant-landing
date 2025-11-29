import type { Metadata } from "next";
import HeroSection from "@/components/sections/talents/HeroSection";
import WhyQuadrantSection from "@/components/sections/talents/WhyQuadrantSection";
import SkillsGraphSection from "@/components/sections/talents/SkillsGraphSection";
import GrowthTracksSection from "@/components/sections/talents/GrowthTracksSection";
import HowItWorksSection from "@/components/sections/talents/HowItWorksSection";
import FAQSection from "@/components/sections/talents/FAQSection";
import TalentsCTASection from "@/components/sections/talents/CTASection";

export const metadata: Metadata = {
  title: "Quadrant для специалистов — честные карьерные треки",
  description:
    "Quadrant показывает текущий уровень, реальные артефакты и помогает готовиться к промо.",
};

const heroMetrics = [
  { label: "Артефактов за 90 дней", value: "48" },
  { label: "Review активности", value: "26 PR" },
  { label: "Темы задач", value: "Биллинг, масштабирование" },
  { label: "Документы", value: "5 RFC и 3 ADR" },
];

const benefits = [
  {
    title: "Видно реальную работу",
    description: "Код, задачи и документы говорят за вас — без красивых PDF и громких слов.",
  },
  {
    title: "Понятные зоны роста",
    description: "Видно, какие навыки и артефакты подтягивать, чтобы перейти на следующий уровень.",
  },
  {
    title: "Честные разговоры о промо",
    description: "Говорите с менеджером и HR на языке артефактов и реального вклада.",
  },
  {
    title: "Лучшие офферы",
    description: "Компании видят ваш реальный граф навыков, а не только ключевые слова в резюме.",
  },
];

const skillClusters = [
  { title: "Backend", skills: ["Go", "PostgreSQL", "gRPC"] },
  { title: "Infrastructure", skills: ["Kubernetes", "Helm", "CI/CD"] },
  { title: "Leadership", skills: ["Code Review", "System Design", "RFC"] },
  { title: "Data", skills: ["Metrics", "Billing Events", "Analytics"] },
];

const artifacts = [
  {
    title: "Feature: платежи для Enterprise-клиентов",
    tags: ["Go", "PostgreSQL", "Billing"],
  },
  {
    title: "Рефакторинг биллинга и оптимизация хранилища",
    tags: ["System Design", "Performance"],
  },
  {
    title: "Code review: миграция на Kubernetes",
    tags: ["Kubernetes", "Platform"],
  },
  {
    title: "RFC: новая модель лимитов",
    tags: ["Docs", "Architecture"],
  },
];

const tracks = [
  {
    title: "Технический лидер",
    description: "Сосредоточен на архитектуре и сложных фичах.",
    points: [
      "Quadrant подсветит дизайн-документы и обзоры архитектуры",
      "Помогает показать влияние на системные решения",
      "Показывает готовность вести инициативы",
    ],
  },
  {
    title: "Эксперт-индивидуалист",
    description: "Глубокие знания в домене и сложные задачи.",
    points: [
      "Фиксирует редкие навыки и исследовательские работы",
      "Привязывает R&D к задачам и кодовым артефактам",
      "Доказывает ценность узкой экспертизы",
    ],
  },
  {
    title: "Менеджер / тимлид",
    description: "Организует работу команды и коммуницирует с бизнесом.",
    points: [
      "Собирает артефакты встреч, синков и планов",
      "Показывает постановку задач и координацию команды",
      "Помогает аргументировать промо в управленческий трек",
    ],
  },
];

const howSteps = [
  {
    title: "Подключаем рабочие аккаунты",
    description: "Git, таск-трекер и документы по согласованию с компанией.",
  },
  {
    title: "Строим граф артефактов",
    description: "Связываем задачи, код и обсуждения с навыками и ролями.",
  },
  {
    title: "Собираем дашборд",
    description: "Менеджер и HR видят ваш вклад, уровни и риски.",
  },
  {
    title: "Обсуждаем развитие",
    description: "Промо, роли, обучение — на базе фактической работы.",
  },
];

const faqItems = [
  {
    question: "Видит ли Quadrant личные репозитории и переписку?",
    answer: "Нет. Мы работаем только с доступами, которые подтверждает компания, и собираем данные из согласованных источников.",
  },
  {
    question: "Как Quadrant влияет на промо и пересмотр зарплаты?",
    answer: "Quadrant делает вклад прозрачным: менеджер опирается на артефакты, а вы понимаете, чего не хватает до следующего грейда.",
  },
  {
    question: "Что будет, если я сменю команду или компанию?",
    answer: "Граф навыков переносится вместе с вами: новый менеджер видит историю артефактов и быстрее подключает вас к задачам.",
  },
  {
    question: "Могу ли я скрыть часть проектов?",
    answer: "Да. Компания выбирает репозитории и документы, которые можно анализировать, а конфиденциальные проекты можно исключить.",
  },
];

const skillsGraphAnchorId = "skills-graph";
const primaryCtaHref = "/auth/register";
const secondaryCtaHref = `#${skillsGraphAnchorId}`;

export default function TalentsPage() {
  return (
    <div className="space-y-16 pb-20">
      <HeroSection
        title="Quadrant помогает специалистам показать реальные навыки, а не только резюме"
        subtitle="Quadrant считывает ваш код, задачи и документы, показывает сильные стороны, артефакты и то, как вы усиливаете команду."
        profileName="Илья, Senior Backend"
        profileRole="Go · платежи · системный дизайн"
        topSkills={["Go", "PostgreSQL", "Kubernetes", "System Design"]}
        metrics={heroMetrics}
        primaryHref={primaryCtaHref}
        secondaryHref={secondaryCtaHref}
      />
      <WhyQuadrantSection benefits={benefits} />
      <SkillsGraphSection clusters={skillClusters} artifacts={artifacts} anchorId={skillsGraphAnchorId} />
      <GrowthTracksSection tracks={tracks} />
      <HowItWorksSection steps={howSteps} />
      <FAQSection items={faqItems} />
      <TalentsCTASection primaryHref={primaryCtaHref} secondaryHref={secondaryCtaHref} />
    </div>
  );
}

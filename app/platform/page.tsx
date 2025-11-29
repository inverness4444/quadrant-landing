import type { Metadata } from "next";
import HeroSection from "@/components/sections/platform/HeroSection";
import IntegrationsSection from "@/components/sections/platform/IntegrationsSection";
import DataFlowSection from "@/components/sections/platform/DataFlowSection";
import SecuritySection from "@/components/sections/platform/SecuritySection";
import RolesSection from "@/components/sections/platform/RolesSection";
import PlatformCTASection from "@/components/sections/platform/CTASection";

export const metadata: Metadata = {
  title: "Quadrant — о платформе",
  description:
    "Узнайте, как Quadrant подключает ваши инструменты, строит граф навыков и помогает видеть риски, рост и вклад команды.",
};

const heroHighlights = [
  "Подключаем репозитории, таск-трекеры, документы и рабочие чаты",
  "Связываем артефакты с навыками и сотрудниками автоматически",
  "Показываем карту рисков, точек роста и хода пилота в реальном времени",
];

const integrations = [
  {
    title: "GitHub и GitLab",
    subtitle: "PR, ревью, ветки, комментарии к коду",
    artifacts: "Pull requests, ревью и ветки для оценки инженерной экспертизы.",
  },
  {
    title: "Jira и YouTrack",
    subtitle: "Задачи, статусы, исполнители, story points",
    artifacts: "История задач и вклад команд, чтобы видеть загрузку и риски.",
  },
  {
    title: "Confluence и Notion",
    subtitle: "RFC, ADR, архитектура и внутренние вики",
    artifacts: "Документы, подтверждающие экспертизу и процесс принятия решений.",
  },
  {
    title: "Slack и Microsoft Teams",
    subtitle: "Публичные каналы про работу и тех.решения",
    artifacts: "Обсуждения, которые дополняют картину по навыкам и ответственности.",
  },
  {
    title: "CI/CD и аналитические отчёты",
    subtitle: "Dashboards, сборки, эксперименты",
    artifacts: "Автоматические метрики, чтобы понять влияние работы на продукт.",
  },
  {
    title: "HRIS и LMS",
    subtitle: "Грейды, обучения, планы развития",
    artifacts: "Привязываем развитие к реальным артефактам и задачам.",
  },
];

const dataFlowSteps = [
  {
    title: "Подключаете источники",
    description: "Доступ к репозиториям, таск-трекерам, wiki и рабочим каналам. Всё по принципу наименьших прав.",
  },
  {
    title: "Quadrant строит граф",
    description: "Артефакты связываются с людьми и навыками. Видно вклад, риски одиночек и точки роста.",
  },
  {
    title: "Вы работаете с панелями",
    description: "Тимлиды, HR и руководство видят свои дашборды и отчёты по навыкам, промо и обучению.",
  },
];

const securityPoints = [
  {
    title: "Шифрование и аудит",
    description: "Данные шифруются в хранении и при передаче. Каждый запрос и синхронизация логируются.",
  },
  {
    title: "Уровни доступа и маскирование",
    description: "Гибкие роли для HR, тимлидов и руководителей. Можно скрывать репозитории и типы задач.",
  },
  {
    title: "Работаем только с разрешённым",
    description: "Quadrant берёт только рабочие артефакты. Личные чаты и частные заметки не анализируются.",
  },
  {
    title: "On-premise и private cloud",
    description: "Поддерживаем развёртывание в вашем VPC, on-premise, а также корпоративный SSO/SAML.",
  },
];

const roleCards = [
  {
    title: "Тимлиды и менеджеры",
    description: "Видят риски по навыкам, готовность к промо и аргументы для планирования ресурсов.",
  },
  {
    title: "HR / People",
    description: "Получают прозрачные профили и динамику развития без ручных таблиц и презентаций.",
  },
  {
    title: "C-level и фаундеры",
    description: "Понимают, какие команды готовы масштабироваться и куда инвестировать бюджет на обучение.",
  },
  {
    title: "Специалисты",
    description: "Получают честный профиль с реальными артефактами и рекомендациями по развитию.",
  },
];

export default function PlatformPage() {
  return (
    <div className="space-y-16 pb-20">
      <HeroSection
        title="О платформе Quadrant"
        subtitle="Quadrant подключает Git, таск-трекеры, документы и рабочие чаты, строит граф навыков и показывает, как развивается команда."
        highlights={heroHighlights}
        primaryHref="/contact#pilot"
        secondaryHref="/demo"
      />
      <IntegrationsSection items={integrations} />
      <DataFlowSection steps={dataFlowSteps} />
      <SecuritySection points={securityPoints} />
      <RolesSection roles={roleCards} />
      <PlatformCTASection
        title="Обсудить пилот на ваших данных"
        subtitle="Подключаемся к существующим инструментам за 3–6 недель, строим граф навыков и показываем, где укрепить команду."
        primaryHref="/contact#pilot"
        secondaryHref="/pricing"
      />
    </div>
  );
}

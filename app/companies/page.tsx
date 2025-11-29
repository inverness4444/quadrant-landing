import type { Metadata } from "next";
import HeroSection from "@/components/sections/companies/HeroSection";
import ProblemsSection from "@/components/sections/companies/ProblemsSection";
import HowPilotWorksSection from "@/components/sections/companies/HowPilotWorksSection";
import IntegrationsSection from "@/components/sections/companies/IntegrationsSection";
import OutcomesSection from "@/components/sections/companies/OutcomesSection";
import RolesSection from "@/components/sections/companies/RolesSection";
import FAQSection from "@/components/sections/companies/FAQSection";
import CompaniesCTASection from "@/components/sections/companies/CTASection";

export const metadata: Metadata = {
  title: "Quadrant для компаний — прозрачные навыки и грейды",
  description:
    "Quadrant помогает компаниям увидеть реальные навыки сотрудников, объективно проводить performance-review и планировать развитие команды.",
};

const heroPoints = [
  "Понимать, кто готов к промо по реальным артефактам",
  "Видеть узкие места и одиночных экспертов",
  "Инвестировать обучение туда, где это меняет работу",
];

const heroMetrics = [
  { label: "Сотрудники", value: "200–5000" },
  { label: "Пилот", value: "3–6 недель" },
  { label: "Формат", value: "Диагностика → интеграции" },
  { label: "Выводы", value: "Граф навыков и презентация" },
];

const problems = [
  {
    title: "Не видно реальных навыков",
    description: "Есть грейды и формальные ревью, но нет картины, кто чем действительно силён.",
  },
  {
    title: "Локальные звёзды выгорают",
    description: "Команда не тянет, потому что знание держится на нескольких людях, остальные остаются в тени.",
  },
  {
    title: "Обучение оторвано от задач",
    description: "Курсы не связаны с реальной работой, сложно доказать эффект от вложений.",
  },
  {
    title: "Сложно планировать промо и найм",
    description: "Нет карты сильных и слабых зон — решения принимаются интуитивно и затягиваются.",
  },
];

const pilotSteps = [
  {
    title: "Диагностика",
    duration: "1 неделя",
    description: "Обсуждаем цели, выбираем команды, согласуем источники и доступы.",
  },
  {
    title: "Сбор артефактов",
    duration: "1–2 недели",
    description: "Подключаем Git/Jira/Confluence/Notion/Slack, анализируем код, задачи и обсуждения.",
  },
  {
    title: "Дашборд и инсайты",
    duration: "1 неделя",
    description: "Строим граф навыков, подсвечиваем кандидатов на промо, риски и пробелы.",
  },
  {
    title: "Презентация действий",
    duration: "Финал",
    description: "Встреча с руководителями: план по промо, найму, обучению и оргструктуре.",
  },
];

const integrations = ["GitHub / GitLab", "Jira", "Confluence / Notion", "Slack", "YouTrack / Azure DevOps"];

const outcomes = [
  {
    title: "Прозрачная карта навыков",
    description: "Видите сильные и слабые стороны команд по фактическим артефактам.",
  },
  {
    title: "Обоснованные промо",
    description: "Повышения опираются на вклад в код, задачи и документы, а не только мнения.",
  },
  {
    title: "Точечное обучение",
    description: "Бюджет идёт в реальные пробелы, а не в модные курсы.",
  },
  {
    title: "Карта рисков по людям",
    description: "Замечаете одиночных экспертов и готовите дублёров заранее.",
  },
];

const roles = [
  {
    title: "Тимлиды и руководители",
    points: ["Видят нагрузку и зоны роста по людям", "Планируют развитие и делегирование без догадок"],
  },
  {
    title: "HR / HRBP / People",
    points: ["Говорят с менеджерами на языке данных", "Строят карьерные треки и программы развития"],
  },
  {
    title: "C-level и фаундеры",
    points: ["Понимают, где команда готова масштабироваться", "Видят, куда инвестировать в найм и обучение"],
  },
];

const faqItems = [
  {
    question: "Нужно ли подключать все репозитории и таск-трекеры сразу?",
    answer: "Нет. На пилоте выбираем 1–2 ключевые команды и подключаем только нужные источники, чтобы показать ценность быстро.",
  },
  {
    question: "Как Quadrant относится к конфиденциальности кода и документов?",
    answer: "Работаем с ограниченными доступами, шифруем данные в покое и передаче, ведём аудит действий. Берём только разрешённые артефакты.",
  },
  {
    question: "Можно ли запускать пилот на одном департаменте?",
    answer: "Да, чаще всего начинаем с одного продукта или инженерного блока, затем масштабируемся.",
  },
  {
    question: "Сколько людей участвует со стороны компании?",
    answer: "Обычно 1–2 координатора и ответственные по интеграциям. На презентации подключаются HRD, CTO и тимлиды.",
  },
  {
    question: "Что происходит после пилота?",
    answer: "Передаём граф навыков, рекомендации и план масштабирования. Помогаем внедрить Quadrant в рабочий процесс.",
  },
];

const pilotAnchorId = "pilot-timeline";

export default function CompaniesPage() {
  return (
    <div className="space-y-16 pb-20">
      <HeroSection
        title="Quadrant помогает компаниям видеть реальные навыки команд и риски по людям"
        subtitle="Мы анализируем код, задачи и документы, строим граф навыков и показываем, кто готов к промо, где узкие места и куда инвестировать обучение."
        points={heroPoints}
        metrics={heroMetrics}
        ctaHref="/contact"
        pilotHref={`#${pilotAnchorId}`}
      />
      <ProblemsSection problems={problems} />
      <HowPilotWorksSection steps={pilotSteps} anchorId={pilotAnchorId} />
      <IntegrationsSection integrations={integrations} />
      <OutcomesSection outcomes={outcomes} />
      <RolesSection roles={roles} />
      <FAQSection items={faqItems} />
      <CompaniesCTASection primaryHref="/contact" secondaryHref="/contact" />
    </div>
  );
}

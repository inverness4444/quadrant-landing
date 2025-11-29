import type { Metadata } from "next";
import PricingHeroSection from "@/components/sections/pricing/HeroSection";
import PlansSection, { type PricingPlan } from "@/components/sections/pricing/PlansSection";
import PilotSection from "@/components/sections/pricing/PilotSection";
import ForTalentsNoteSection from "@/components/sections/pricing/ForTalentsNoteSection";
import PricingFAQSection from "@/components/sections/pricing/FAQSection";
import PricingCTASection from "@/components/sections/pricing/CTASection";

export const metadata: Metadata = {
  title: "Quadrant — тарифы и предложения",
  description:
    "Тарифы Quadrant для старта, роста и enterprise-команд. Уточните цену под ваши процессы и интеграции.",
};

const primaryCtaHref = "/contact";
const pilotAnchorId = "pilot";

const pricingPlans: PricingPlan[] = [
  {
    title: "Pilot",
    audience: "Для 1–3 команд",
    description: "Проверить гипотезу за 30–90 дней и показать ценность Quadrant на реальных данных.",
    limit: "До 50 специалистов",
    features: [
      "2–3 интеграции: Git + таск-трекер + знания",
      "Базовый дашборд по людям и навыкам",
      "Поддержка через чат",
    ],
    badge: "Старт",
    cta: { label: "Запросить пилот", href: primaryCtaHref },
  },
  {
    title: "Growth",
    audience: "Для нескольких департаментов",
    description: "Раскатываем Quadrant на масштаб компании с HR, HRBP и тимлидами.",
    limit: "До 20 команд",
    features: [
      "Расширенные отчёты для HR и HRBP",
      "Роли и права доступа",
      "Совместная настройка грейдов и матриц навыков",
      "Приоритизированная поддержка",
    ],
    badge: "Популярный выбор",
    highlight: true,
    cta: { label: "Запросить расчёт", href: primaryCtaHref },
  },
  {
    title: "Enterprise",
    audience: "Для крупных продуктовых компаний и холдингов",
    description: "Гибкость, безопасность и выделенная команда Quadrant.",
    limit: "Неограниченно команд",
    features: [
      "Он-прем или dedicated-облако",
      "SSO, аудит, расширенные политики доступа",
      "Совместный дизайн отчётов под C-level",
      "Выделенный аккаунт-менеджер",
    ],
    cta: { label: "Обсудить Enterprise", href: primaryCtaHref },
  },
];

const pilotSteps = [
  {
    title: "Диагностика",
    description: "Выбираем команды, источники данных и цели пилота.",
  },
  {
    title: "Интеграции",
    description: "Подключаем Git, таск-трекер и Wiki/Notion по согласованию.",
  },
  {
    title: "Граф навыков",
    description: "Считаем артефакты, строим дашборды по людям и ролям.",
  },
  {
    title: "Обсуждение результатов",
    description: "Решаем, как масштабировать Quadrant и куда инвестировать развитие.",
  },
];

const faqItems = [
  {
    question: "Можно ли начать с одной команды?",
    answer: "Да. Пилот рассчитан на 1–3 команды и длится 30–90 дней, чтобы показать ценность быстро.",
  },
  {
    question: "Какие интеграции входят в базовую стоимость?",
    answer: "Git, таск-трекер и один источник знаний. Дополнительные интеграции обсуждаем отдельно.",
  },
  {
    question: "Стоимость считается по сотрудникам или активным пользователям?",
    answer: "Есть модели по количеству активных специалистов и по числу команд — подберём вариант под ваши процессы.",
  },
  {
    question: "Что с безопасностью и он-прем?",
    answer: "Quadrant может работать он-прем или в dedicated-облаке, есть SSO, аудит и гибкие роли.",
  },
  {
    question: "Можно ли получить фиксированное коммерческое предложение?",
    answer: "Да. После короткого созвона предложим 2–3 конфигурации с фиксированными параметрами.",
  },
];

export default function PricingPage() {
  return (
    <div className="space-y-16 pb-20">
      <PricingHeroSection primaryHref={primaryCtaHref} secondaryHref={`#${pilotAnchorId}`} />
      <PlansSection plans={pricingPlans} />
      <PilotSection
        steps={pilotSteps}
        note="Стоимость пилота зависит от количества команд и интеграций. Обычно предлагаем 2–3 конфигурации на выбор."
        anchorId={pilotAnchorId}
      />
      <ForTalentsNoteSection ctaHref="/talents" />
      <PricingFAQSection items={faqItems} />
      <PricingCTASection />
    </div>
  );
}

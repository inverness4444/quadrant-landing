import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import DemoLoginBanner from "@/components/marketing/DemoLoginBanner";
import SectionTitle from "@/components/common/SectionTitle";
import { listAllPlans } from "@/repositories/planRepository";
import { env } from "@/config/env";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quadrant — живая карта навыков вашей команды",
  description:
    "Quadrant анализирует реальные артефакты работы, строит граф навыков и помогает компаниям развивать внутренние таланты.",
  openGraph: {
    title: "Quadrant — живая карта навыков вашей команды",
    description:
      "Живой граф навыков, прозрачные карьерные треки и честное performance-review.",
    url: "https://quadrant.app/",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Quadrant — карта навыков",
      },
    ],
  },
};

const heroBullets = [
  {
    title: "Тимлидам и HR",
    description: "Видят реальную матрицу навыков и зоны риска по людям.",
  },
  {
    title: "CTO и фаундерам",
    description: "Опираются на артефакты: код, задачи, документы и метрики.",
  },
  {
    title: "Специалистам",
    description: "Понимают, что нужно для следующего грейда и промо.",
  },
];

const audienceCards = [
  {
    title: "Тимлидам и HR",
    description:
      "Матрица навыков в реальном времени, риски по людям и подсказки, кого поддержать и кто готов к росту.",
  },
  {
    title: "СТО и фаундерам",
    description:
      "Связываем артефакты (код, задачи, документы) с навыками, чтобы инвестировать в промо и обучение осознанно.",
  },
  {
    title: "L&D и People Ops",
    description:
      "Привязываем обучение к реальной работе и графу навыков, фиксируем прогресс и эффект от программ развития.",
  },
];

const workSteps = [
  {
    title: "1. Подключаем источники",
    description: "GitHub/GitLab, Jira, Confluence или Notion, Slack и внутренние базы знаний.",
    badge: "3–10 дней",
  },
  {
    title: "2. Строим граф навыков",
    description: "Связываем задачи, код и документы с навыками и сотрудниками автоматически.",
    badge: "Автоматический анализ",
  },
  {
    title: "3. Пилот и отчёты",
    description: "Запускаем пилот на 1–2 командах, показываем риски, матрицу навыков и предложения по промо.",
    badge: "Пилот 30–90 дней",
  },
];

const securityHighlights = [
  {
    title: "Только разрешённые артефакты",
    description: "Quadrant анализирует лишь те репозитории и задачи, к которым вы вручную дали доступ.",
  },
  {
    title: "Разделение доступов",
    description: "Гранулируем видимость по отделам и ролям, чтобы каждая команда видела только свои данные.",
  },
  {
    title: "On-premise и SSO",
    description: "Поддерживаем развёртывание в периметре и подключение корпоративного SSO по запросу.",
  },
  {
    title: "Шифрование данных",
    description: "Данные шифруются в транзите и хранении с использованием проверенных облачных практик.",
  },
];

const previewPanels = [
  {
    title: "Дашборд",
    description: "Рост команды, загрузка интеграций и план по навыкам.",
  },
  {
    title: "Навыки и треки",
    description: "Фильтруйте по уровню, типу навыка и артефактам.",
  },
  {
    title: "Профиль сотрудника",
    description: "Все артефакты, оценки и шаги развития в одном месте.",
  },
];

export default async function HomePage() {
  const demoEnabled = Boolean(env.demo.enabled);
  const plans = await listAllPlans();
  const orderedPlans = ["free", "growth", "scale"].map((code) =>
    plans.find((plan) => plan.code === code),
  );

  return (
    <div className="space-y-20 pb-20">
      <Hero demoEnabled={demoEnabled} />

      <section className="space-y-6">
        <SectionTitle
          title="Для кого Quadrant"
          subtitle="Quadrant полезен компаниям от 200 до 5000 сотрудников: продуктовые и ИТ-команды, R&D, консалтинг и крупные внутренние платформы."
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {audienceCards.map((card) => (
            <Card key={card.title} className="space-y-3 p-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary/10 to-brand-accent/10 text-lg font-semibold text-brand-primary">
                  •
                </span>
                <p className="text-lg font-semibold text-brand-text">{card.title}</p>
              </div>
              <p className="text-sm text-slate-600">{card.description}</p>
            </Card>
          ))}
        </div>
        <p className="text-center text-sm text-slate-500">
          Quadrant лучше всего подходит компаниям от 200 до 5000 сотрудников с сильной продуктовой и инженерной командой.
        </p>
      </section>

      <section className="space-y-6">
        <SectionTitle
          title="Как работает Quadrant"
          subtitle="Подключаем ваши инструменты, строим граф навыков и показываем, кто готов к промо и куда инвестировать обучение."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {workSteps.map((step) => (
            <Card key={step.title} className="space-y-3 p-6">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-brand-text">{step.title}</p>
                <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-semibold text-brand-primary">
                  {step.badge}
                </span>
              </div>
              <p className="text-sm text-slate-600">{step.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionTitle
          title="Безопасность и конфиденциальность"
          subtitle="Quadrant подключается только к тем источникам, которые вы разрешаете, поддерживает on-premise и корпоративный SSO."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {securityHighlights.map((item) => (
            <Card key={item.title} className="space-y-3 p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-primary/10 text-lg text-brand-primary">
                  ✓
                </span>
                <p className="text-base font-semibold text-brand-text">{item.title}</p>
              </div>
              <p className="text-sm text-slate-600">{item.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <SectionTitle
          eyebrow="Продакт в действии"
          title="Лёгкие панели для навыков вашей команды"
          subtitle="Quadrant объединяет сотрудников, навыки и артефакты в одном интерфейсе. Всё выглядит как современные SaaS-инструменты, чтобы команда сразу чувствовала себя дома."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {previewPanels.map((panel, index) => (
            <Card key={panel.title} className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-brand-text">{panel.title}</p>
                <span className="text-xs text-slate-400">0{index + 1}</span>
              </div>
              <p className="text-sm text-slate-600">{panel.description}</p>
              <div className="rounded-2xl border border-white/40 bg-gradient-to-br from-brand-muted/50 to-white p-4 shadow-inner">
                <div className="space-y-3 text-sm text-slate-500">
                  <div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2">
                    <span>Распределение навыков</span>
                    <span className="text-brand-primary/80">+12%</span>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Команда</p>
                    <div className="mt-2 space-y-2">
                      {["Аня Коваль", "Илья Миронов", "Мария Кравец"].map((name) => (
                        <div key={name} className="flex items-center justify-between">
                          <span>{name}</span>
                          <span className="text-slate-400">Senior</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2 text-xs text-slate-500">
                    <span>Артефакты за неделю</span>
                    <span>18</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <SectionTitle
          eyebrow="Тарифы"
          title="Выбирайте план под стадию компании"
          subtitle="Лимиты по команде и интеграциям тянут реальные планы из базы Quadrant."
          align="center"
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {orderedPlans.map((plan) =>
            plan ? (
              <Card
                key={plan.id}
                className={`flex h-full flex-col gap-4 border ${plan.code === "growth" ? "border-brand-primary/40" : "border-white/60"}`}
              >
                {plan.code === "growth" && (
                  <span className="self-start rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-semibold text-brand-primary">
                    Рекомендуем
                  </span>
                )}
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
                  {plan.name}
                </p>
                <p className="text-2xl font-semibold text-brand-text">
                  {plan.pricePerMonth ? `от ${plan.pricePerMonth} $/мес` : "Бесплатно"}
                </p>
                <p className="text-sm text-slate-500">{plan.description}</p>
                <ul className="flex flex-1 flex-col gap-2 text-sm text-slate-600">
                  <li>
                    {plan.maxEmployees && plan.maxEmployees > 0
                      ? `До ${plan.maxEmployees} сотрудников`
                      : "Безлимит по людям"}
                  </li>
                  <li>
                    {plan.maxIntegrations && plan.maxIntegrations > 0
                      ? `${plan.maxIntegrations} интеграции`
                      : "Все интеграции"}
                  </li>
                  <li>
                    {plan.maxMembers && plan.maxMembers > 0
                      ? `До ${plan.maxMembers} участников workspace`
                      : "Безлимит участников"}
                  </li>
                </ul>
                <PrimaryButton
                  href={plan.pricePerMonth === 0 ? "/auth/register" : `/contact?plan=${plan.code}`}
                >
                  {plan.pricePerMonth === 0 ? "Начать бесплатно" : "Запросить пилот"}
                </PrimaryButton>
              </Card>
            ) : null,
          )}
        </div>
      </section>

      <DemoLoginBanner />

      <Card className="flex flex-col gap-4 bg-gradient-to-br from-brand-primary/90 to-brand-accent/80 p-10 text-white md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.4em] text-white/70">Пилот</p>
          <h2 className="text-3xl font-semibold leading-tight">Построим карту навыков за 2 недели</h2>
          <p className="text-sm text-white/80">
            Подключим ваши интеграции, настроим треки, выгрузим артефакты и покажем, как Quadrant меняет карьерные решения.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <SecondaryButton href="/contact" className="bg-white/20">
            Запросить пилот
          </SecondaryButton>
          <SecondaryButton href={demoEnabled ? "/auth/demo-login" : "/contact"} className="bg-white hover:translate-y-0">
            {demoEnabled ? "Посмотреть демо" : "Оставить заявку"}
          </SecondaryButton>
        </div>
      </Card>
    </div>
  );
}

function Hero({ demoEnabled }: { demoEnabled: boolean }) {
  return (
    <section className="grid gap-10 rounded-[32px] border border-white/50 bg-white/80 p-10 shadow-[0_30px_80px_rgba(15,23,42,0.12)] lg:grid-cols-2">
      <div className="space-y-6">
        <p className="text-sm font-semibold uppercase tracking-[0.4em] text-brand-primary/80">Quadrant</p>
        <h1>Живая карта навыков и артефактов команды</h1>
        <p className="text-lg text-slate-600">
          Quadrant анализирует код, задачи и документы, связывает их с навыками и показывает, кто готов к промо, кого пора поддержать и куда инвестировать обучение.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <PrimaryButton href={demoEnabled ? "/auth/demo-login" : "/contact"}>
            {demoEnabled ? "Посмотреть демо" : "Оставить заявку"}
          </PrimaryButton>
          <SecondaryButton href="/contact">Запросить пилот</SecondaryButton>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {heroBullets.map((bullet) => (
            <div key={bullet.title} className="rounded-2xl border border-white/60 bg-brand-muted/60 p-4">
              <p className="text-sm font-semibold text-brand-text">{bullet.title}</p>
              <p className="text-xs text-slate-500">{bullet.description}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="relative">
        <div className="absolute -left-6 -top-6 h-16 w-16 rounded-3xl bg-brand-primary/20 blur-3xl" aria-hidden />
        <Card className="relative h-full rounded-[28px] border border-white/70 bg-white/90 p-6">
          <p className="text-sm font-semibold text-slate-500">Workspace</p>
          <h3 className="text-2xl font-semibold text-brand-text">Demo Company</h3>
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Сотрудники", value: "24" },
                { label: "Навыки", value: "31" },
                { label: "Артефакты", value: "120" },
                { label: "Интеграции", value: "3" },
              ].map((metric) => (
                <div key={metric.label} className="rounded-2xl bg-brand-muted/60 px-3 py-2">
                  <p className="text-xs text-slate-500">{metric.label}</p>
                  <p className="text-lg font-semibold text-brand-text">{metric.value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl bg-brand-muted/60 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Риски</p>
              <div className="mt-3 space-y-2 text-sm">
                {["Мария Кравец", "Владлена Ли", "Глеб Орлов"].map((person) => (
                  <div key={person} className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2">
                    <span>{person}</span>
                    <span className="text-amber-500">Нужен план развития</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "@/components/common/Card";
import MetricCard from "@/components/app/MetricCard";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import type {
  EmployeeRiskEntry,
  SkillAggregate,
  WorkspaceOverview,
} from "@/services/analyticsService";
import type { RiskItem } from "@/services/types/analytics";

type DashboardPayload = {
  ok: boolean;
  overview: WorkspaceOverview;
  topSkills: SkillAggregate[];
  weakSkills: SkillAggregate[];
  riskEmployees: EmployeeRiskEntry[];
};

type DashboardResponse = Omit<DashboardPayload, "ok">;

type DashboardClientProps = {
  workspaceName: string;
  canManageBilling: boolean;
  isDemoWorkspace?: boolean;
};

type OnboardingState = {
  isCompleted: boolean;
  steps: Record<keyof OnboardingStepsDictionary, boolean>;
};

type OnboardingStepsDictionary = {
  createdEmployee: boolean;
  createdSkill: boolean;
  createdTrack: boolean;
  invitedMembers: boolean;
  connectedIntegration: boolean;
};

const ONBOARDING_STEPS: Array<{
  key: keyof OnboardingStepsDictionary;
  title: string;
  description: string;
  href: string;
}> = [
  {
    key: "createdEmployee",
    title: "Добавьте сотрудников",
    description: "Хотя бы один профиль, чтобы Quadrant начал строить карту навыков.",
    href: "/app/team?modal=create",
  },
  {
    key: "createdSkill",
    title: "Создайте ключевые навыки",
    description: "Задайте компетенции, которые важны для вашей команды.",
    href: "/app/skills?modal=create",
  },
  {
    key: "createdTrack",
    title: "Настройте карьерные треки",
    description: "Опишите рост Junior → Middle → Senior по вашим правилам.",
    href: "/app/tracks?modal=create",
  },
  {
    key: "invitedMembers",
    title: "Пригласите коллег",
    description: "Подключите HR/тимлидов, чтобы вместе вести развитие.",
    href: "/app/settings?tab=participants",
  },
  {
    key: "connectedIntegration",
    title: "Подключите интеграции",
    description: "GitHub, Jira, Notion и другие источники артефактов.",
    href: "/app/settings?tab=integrations",
  },
];

const QUICK_ACTIONS = [
  {
    title: "Посмотреть команду",
    description: "Состав, роли и вклад сотрудников",
    href: "/app/team",
  },
  {
    title: "Посмотреть навыки",
    description: "Какие компетенции уже покрыты",
    href: "/app/skills",
  },
  {
    title: "Настроить рабочую область",
    description: "Название, язык, доступы",
    href: "/app/settings?tab=general",
  },
  {
    title: "Добавить участника",
    description: "Пригласите HR или тимлида",
    href: "/app/settings?tab=security#invite-form",
  },
] as const;

const INSIGHT_CARDS = [
  {
    title: "Сильная концентрация знаний по платежам у 2 человек",
    tone: "warning" as const,
    detail: "Ещё одному человеку стоит погрузиться в платежный модуль, чтобы снизить риски.",
  },
  {
    title: "Недостаточно артефактов по ML в продуктовой команде",
    tone: "info" as const,
    detail: "Добавьте связанные задачи из Jira или синхронизируйте Confluence, чтобы Quadrant видел материалы.",
  },
  {
    title: "Гильдия фронтенда ищет наставника",
    tone: "growth" as const,
    detail: "Внутренний пилот по развитию middle-инженеров можно запустить на следующей неделе.",
  },
] as const;

export default function DashboardClient({ workspaceName, canManageBilling, isDemoWorkspace = false }: DashboardClientProps) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [analyticsPreview, setAnalyticsPreview] = useState<{ totalRisks: number; highRisks: number } | null>(null);
  const [analyticsPreviewLoading, setAnalyticsPreviewLoading] = useState(false);
  const [analyticsPreviewError, setAnalyticsPreviewError] = useState<string | null>(null);
  const [pilotSummary, setPilotSummary] = useState<{
    name: string;
    status: string;
    completed: number;
    total: number;
  } | null>(null);
  const [pilotSummaryError, setPilotSummaryError] = useState<string | null>(null);
  const [pilotSummaryLoading, setPilotSummaryLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchDashboard() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/app/dashboard", { cache: "no-store" });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error?.message ?? "Не удалось загрузить данные");
        }
        const payload = (await response.json()) as DashboardPayload;
        if (mounted) {
          setData({
            overview: payload.overview,
            topSkills: payload.topSkills,
            weakSkills: payload.weakSkills,
            riskEmployees: payload.riskEmployees,
          });
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Неизвестная ошибка");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    fetchDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function fetchPilotSummary() {
      setPilotSummaryLoading(true);
      setPilotSummaryError(null);
      try {
        const response = await fetch("/api/app/pilot/runs", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as
          | {
              ok?: boolean;
              runs?: Array<{ id: string; name: string; status: string; summaryProgress: { completedSteps: number; totalSteps: number; percent: number } }>;
              error?: { message?: string };
            }
          | null;
        if (!response.ok || !payload) {
          throw new Error(payload?.error?.message ?? "Не удалось загрузить пилоты");
        }
        if (!mounted) return;
        const active = payload.runs?.find((run) => run.status === "active") ?? payload.runs?.[0];
        if (!active) {
          setPilotSummary(null);
        } else {
          setPilotSummary({
            name: active.name,
            status: active.status,
            completed: active.summaryProgress.completedSteps,
            total: active.summaryProgress.totalSteps,
          });
        }
      } catch (err) {
        if (mounted) {
          setPilotSummary(null);
          setPilotSummaryError(err instanceof Error ? err.message : "Не удалось загрузить пилот");
        }
      } finally {
        if (mounted) {
          setPilotSummaryLoading(false);
        }
      }
    }
    void fetchPilotSummary();
    return () => {
      mounted = false;
    };
  }, []);

  const fetchOnboarding = useCallback(async () => {
    if (isDemoWorkspace) {
      return;
    }
    setOnboardingLoading(true);
    setOnboardingError(null);
    try {
      const response = await fetch("/api/app/onboarding", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("ONBOARDING_LOAD_FAILED");
      }
      const payload = (await response.json()) as OnboardingState;
      setOnboarding(payload);
    } catch (err) {
      setOnboarding(null);
      setOnboardingError(err instanceof Error ? err.message : "Ошибка загрузки состояния");
    } finally {
      setOnboardingLoading(false);
    }
  }, [isDemoWorkspace]);

  useEffect(() => {
    void fetchOnboarding();
  }, [fetchOnboarding]);

  useEffect(() => {
    let mounted = true;
    async function fetchAnalyticsPreview() {
      setAnalyticsPreviewLoading(true);
      setAnalyticsPreviewError(null);
      try {
        const response = await fetch("/api/app/analytics/risks", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as
          | { ok?: boolean; risks?: RiskItem[]; error?: { message?: string } }
          | null;
        if (!response.ok || !payload) {
          throw new Error(payload?.error?.message ?? "Не удалось загрузить риски");
        }
        if (!mounted) return;
        const riskList = payload.risks ?? [];
        setAnalyticsPreview({
          totalRisks: riskList.length,
          highRisks: riskList.filter((risk) => risk.severity === "high").length,
        });
      } catch (err) {
        if (mounted) {
          setAnalyticsPreview(null);
          setAnalyticsPreviewError(err instanceof Error ? err.message : "Не удалось получить аналитику");
        }
      } finally {
        if (mounted) {
          setAnalyticsPreviewLoading(false);
        }
      }
    }
    void fetchAnalyticsPreview();
    return () => {
      mounted = false;
    };
  }, []);

  const overviewCards = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Сотрудники", value: data.overview.employeesCount },
      { label: "Навыки", value: data.overview.skillsCount },
      { label: "Треки", value: data.overview.tracksCount },
      { label: "Интеграции", value: data.overview.integrationsCount },
    ];
  }, [data]);

  const pilotPlanLabel = useMemo(() => {
    if (isDemoWorkspace) {
      return "Пилот: демо-режим";
    }
    if (data?.overview.plan?.name) {
      return `Тариф «${data.overview.plan.name}»`;
    }
    return "Пилот: 3 нед. из 6";
  }, [data, isDemoWorkspace]);

  const heroMetrics = useMemo(
    () => [
      {
        label: "Сотрудники в workspace",
        value: data ? data.overview.employeesCount : "—",
        emphasis: true,
      },
      {
        label: "Артефакты Quadrant",
        value: data ? data.overview.artifactsCount : "—",
      },
      {
        label: "Активные навыки",
        value: data ? data.overview.skillsCount : "—",
      },
      {
        label: "Статус пилота",
        value: pilotPlanLabel,
      },
    ],
    [data, pilotPlanLabel],
  );

  const shouldShowOnboarding = Boolean(
    !isDemoWorkspace && (onboardingLoading || (onboarding && !onboarding.isCompleted)),
  );

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <Card className="flex flex-col justify-between gap-6 bg-gradient-to-br from-white via-brand-muted to-brand-muted/40 p-6">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Обзор Quadrant</p>
              <h1 className="text-3xl font-semibold text-brand-text">Обзор команды в Quadrant</h1>
              <p className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary">
                {workspaceName}
              </p>
              <p className="text-base text-slate-600">
                Краткий статус вашей команды: кто участвует в пилоте, какие артефакты уже подключены и где могут возникнуть риски.
                Quadrant собирает сигналы из кода, задач и документов, чтобы вы приняли решение быстрее.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <PrimaryButton href="/app/team" className="px-5">
                Открыть команду
              </PrimaryButton>
              <SecondaryButton href="/app/settings?tab=general" className="px-5">
                Настроить рабочую область
              </SecondaryButton>
              {canManageBilling && (
                <SecondaryButton href="/app/settings?tab=billing" className="px-5">
                  Управлять тарифом
                </SecondaryButton>
              )}
            </div>
          </Card>
          <Card className="space-y-4 p-6">
            <div>
              <p className="text-sm font-semibold text-brand-text">Пульс workspace</p>
              <p className="text-xs text-slate-500">Данные обновляются в реальном времени</p>
            </div>
            <div className="space-y-4">
              {heroMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="flex items-start justify-between gap-3 rounded-2xl bg-brand-muted/40 px-4 py-3"
                >
                  <p className="text-sm text-slate-500">{metric.label}</p>
                  <p
                    className={`text-right text-lg font-semibold text-brand-text ${
                      metric.emphasis ? "text-2xl" : ""
                    }`}
                  >
                    {metric.value ?? "—"}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
        {shouldShowOnboarding && (
          <Card
            data-testid="onboarding-panel"
            className="space-y-4 border border-brand-primary/30 bg-gradient-to-br from-white to-brand-muted/40"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-brand-primary/80">
                  Начало работы
                </p>
                <h2 className="text-xl font-semibold text-brand-text">Начните работу с Quadrant</h2>
                <p className="text-sm text-slate-600">
                  Следуйте шагам ниже, чтобы за 5 минут собрать карту навыков вашей команды.
                </p>
              </div>
              <button
                type="button"
                className="text-sm font-semibold text-brand-primary hover:underline disabled:text-slate-400"
                onClick={() => fetchOnboarding()}
                disabled={onboardingLoading}
              >
                {onboardingLoading ? "Обновляем…" : "Обновить"}
              </button>
            </div>
            {onboardingError && (
              <p className="text-sm text-red-500">
                Не удалось загрузить состояние онбординга. {onboardingError}
              </p>
            )}
            <div className="space-y-3">
              {ONBOARDING_STEPS.map((step) => {
                const completed = Boolean(onboarding?.steps[step.key]);
                return (
                  <div
                    key={step.key}
                    data-testid={`onboarding-step-${step.key}`}
                    data-complete={completed ? "true" : "false"}
                    className="flex flex-col gap-3 rounded-2xl border border-white/60 bg-white/80 p-4 text-sm text-slate-600 md:flex-row md:items-center"
                  >
                    <div className="flex flex-1 items-start gap-3">
                      <span
                        className={`mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border ${
                          completed
                            ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                            : "border-slate-300 text-slate-400"
                        }`}
                        aria-hidden
                      >
                        {completed ? "✓" : ""}
                      </span>
                      <div>
                        <p className="font-semibold text-brand-text">{step.title}</p>
                        <p className="text-xs text-slate-500">{step.description}</p>
                      </div>
                    </div>
                    <Link
                      href={step.href}
                      className="inline-flex items-center justify-center rounded-full border border-white/70 bg-white px-4 py-2 text-sm font-semibold text-brand-text transition hover:border-brand-primary/60"
                    >
                      Перейти
                    </Link>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      <section aria-labelledby="quick-actions">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="quick-actions" className="text-xl font-semibold text-brand-text">
              Быстрые действия
            </h2>
            <p className="text-sm text-slate-500">Перейдите к ключевым разделам рабочего пространства.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.href} href={action.href} className="group block">
              <Card className="h-full space-y-2 border border-brand-border/70 transition group-hover:border-brand-primary/60 group-hover:shadow-lg">
                <p className="text-base font-semibold text-brand-text">{action.title}</p>
                <p className="text-sm text-slate-500">{action.description}</p>
                <span className="text-sm font-semibold text-brand-primary">Перейти →</span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="pilot-highlight">
        <Card className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Пилот Quadrant</p>
            <h2 id="pilot-highlight" className="text-xl font-semibold text-brand-text">
              Прогресс пилота
            </h2>
            {pilotSummaryError ? (
              <p className="text-sm text-red-600">{pilotSummaryError}</p>
            ) : pilotSummary ? (
              <p className="text-sm text-slate-500">
                {pilotSummary.name} · статус {pilotStatusLabel(pilotSummary.status)}.
              </p>
            ) : (
              <p className="text-sm text-slate-500">Пилот ещё не настроен.</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <PilotPreviewMetric
                label="Завершено шагов"
                value={
                  pilotSummary && pilotSummary.total > 0
                    ? `${pilotSummary.completed} / ${pilotSummary.total}`
                    : "—"
                }
                loading={pilotSummaryLoading && !pilotSummary}
              />
              <PilotPreviewMetric
                label="Статус"
                value={pilotSummary ? pilotStatusLabel(pilotSummary.status) : "Нет данных"}
                loading={pilotSummaryLoading && !pilotSummary}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <PrimaryButton href="/app/pilot" className="px-5 py-3">
              Перейти к пилоту
            </PrimaryButton>
            <SecondaryButton href="/app/reports" className="px-5 py-3">
              Отчёты для руководства
            </SecondaryButton>
          </div>
        </Card>
      </section>

      <section aria-labelledby="analytics-highlight">
        <Card className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Аналитика</p>
            <h2 id="analytics-highlight" className="text-xl font-semibold text-brand-text">
              Быстрый взгляд на риски
            </h2>
            {analyticsPreviewError ? (
              <p className="text-sm text-red-600">{analyticsPreviewError}</p>
            ) : (
              <p className="text-sm text-slate-500">
                {analyticsPreview && analyticsPreview.totalRisks > 0
                  ? `Навыков в риске: ${analyticsPreview.totalRisks}. Критичных навыков: ${
                      analyticsPreview.highRisks
                    }.`
                  : "Пока всё спокойно — но рекомендовано проверять аналитику раз в неделю."}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <AnalyticsPreviewMetric
                label="Навыков в зоне риска"
                value={analyticsPreview?.totalRisks ?? "—"}
                loading={analyticsPreviewLoading && !analyticsPreview}
              />
              <AnalyticsPreviewMetric
                label="Критичные навыки"
                value={analyticsPreview?.highRisks ?? "—"}
                loading={analyticsPreviewLoading && !analyticsPreview}
              />
            </div>
          </div>
          <PrimaryButton href="/app/analytics" className="px-5 py-3">
            Открыть аналитику
          </PrimaryButton>
        </Card>
      </section>

      {error && (
        <Card className="border-red-200 bg-red-50 text-sm text-red-800">
          Не удалось загрузить дашборд: {error}. Попробуйте перезагрузить страницу.
        </Card>
      )}

      <section data-testid="dashboard-overview">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-brand-text">Обзор компании</h2>
            <p className="text-sm text-slate-500">Распределение ресурсов на уровне workspace.</p>
          </div>
        </div>
        {loading && !data ? (
          <OverviewSkeleton />
        ) : data ? (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {overviewCards.map((metric) => (
                <MetricCard key={metric.label} label={metric.label} value={metric.value} />
              ))}
            </div>
            <Card className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {data.overview.plan ? (
                <>
                  <div>
                    <p className="text-sm text-slate-500">Тариф</p>
                    <p className="text-lg font-semibold text-brand-text">{data.overview.plan.name}</p>
                    <p className="text-sm text-slate-500">
                      Сотрудники: {data.overview.plan.currentEmployeesCount}
                      {renderLimit(data.overview.plan.maxEmployees)} • Интеграции:{" "}
                      {data.overview.plan.currentIntegrationsCount}
                      {renderLimit(data.overview.plan.maxIntegrations)}
                    </p>
                  </div>
                  {canManageBilling && (
                    <SecondaryButton href="/app/settings?tab=billing">
                      Открыть «Тариф и биллинг»
                    </SecondaryButton>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-600">
                  Похоже, план ещё не выбран. Обратитесь к администратору, чтобы подключить тариф.
                </p>
              )}
            </Card>
          </>
        ) : (
          <EmptyDashboardNotice />
        )}
      </section>

      <section>
        <SectionHeading
          title="Риски и возможности"
          description="Заглушка с наблюдениями Quadrant — добавьте свои собственные сигналы позже."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {INSIGHT_CARDS.map((insight) => (
            <Card
              key={insight.title}
              className={`space-y-2 border ${
                insight.tone === "warning"
                  ? "border-amber-200 bg-amber-50/60"
                  : insight.tone === "growth"
                    ? "border-emerald-200 bg-emerald-50/60"
                    : "border-brand-border bg-white"
              }`}
            >
              <p className="text-base font-semibold text-brand-text">{insight.title}</p>
              <p className="text-sm text-slate-600">{insight.detail}</p>
            </Card>
          ))}
        </div>
      </section>

      <section data-testid="top-skills">
          <SectionHeading
            title="Сильные навыки"
            description="Навыки, где команда чувствует себя увереннее всего."
          />
        {loading && !data ? (
          <ListSkeleton />
        ) : data && data.topSkills.length > 0 ? (
          <SkillList items={data.topSkills} />
        ) : (
          <EmptyState message="Пока недостаточно данных. Добавьте сотрудников и их навыки." />
        )}
      </section>

      <section data-testid="weak-skills">
          <SectionHeading
            title="Навыки группы риска"
            description="Компетенции, где средний уровень ниже целевого."
          />
        {loading && !data ? (
          <ListSkeleton />
        ) : data && data.weakSkills.length > 0 ? (
          <SkillList items={data.weakSkills} highlightWeak />
        ) : (
          <EmptyState message="Нет навыков в зоне риска — отличная работа команды!" />
        )}
      </section>

      <section data-testid="dashboard-risk-employees">
        <SectionHeading
          title="Сотрудники с рисками развития"
          description="Коллеги, которым нужна поддержка: мало навыков, низкие оценки или разрыв по треку."
        />
        {loading && !data ? (
          <ListSkeleton rows={3} />
        ) : data && data.riskEmployees.length > 0 ? (
          <div className="grid gap-4">
            {data.riskEmployees.map((employee) => (
              <Card key={employee.employeeId} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold text-brand-text">{employee.name}</p>
                    <p className="text-sm text-slate-500">{employee.position}</p>
                  </div>
                  <a
                    href={`/app/team/${employee.employeeId}`}
                    className="text-sm font-semibold text-brand-primary hover:underline"
                  >
                    Открыть профиль →
                  </a>
                </div>
                <div className="text-sm text-slate-500">
                  {employee.trackName ? `${employee.trackName}` : "Трек не назначен"}
                  {employee.trackLevelName ? ` • уровень ${employee.trackLevelName}` : ""}
                </div>
                <div className="space-y-2">
                  {employee.problems.map((problem, index) => (
                    <div
                      key={`${problem.skillId ?? "generic"}-${index}`}
                      className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold">{problem.skillName}</span>
                        <span>
                          {formatLevel(problem.currentLevel)} / {formatLevel(problem.targetLevel)}
                        </span>
                      </div>
                      {problem.note && <p className="mt-1 text-xs text-amber-900">{problem.note}</p>}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState message="Пока никто не находится в зоне риска. Продолжайте отслеживать прогресс команды." />
        )}
      </section>
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4 space-y-1">
      <h2 className="text-xl font-semibold text-brand-text">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  );
}

function AnalyticsPreviewMetric({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | string;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      {loading ? (
        <div className="mt-2 h-6 w-16 animate-pulse rounded bg-slate-200" />
      ) : (
        <p className="text-2xl font-semibold text-brand-text">{value}</p>
      )}
    </div>
  );
}

function PilotPreviewMetric({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      {loading ? (
        <div className="mt-2 h-6 w-16 animate-pulse rounded bg-slate-200" />
      ) : (
        <p className="text-2xl font-semibold text-brand-text">{value}</p>
      )}
    </div>
  );
}

function pilotStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Активный";
    case "completed":
      return "Завершён";
    case "planned":
      return "Запланирован";
    case "archived":
      return "Архив";
    default:
      return status;
  }
}

function SkillList({
  items,
  highlightWeak = false,
}: {
  items: SkillAggregate[];
  highlightWeak?: boolean;
}) {
  return (
    <Card className="divide-y divide-brand-border p-0">
      {items.map((item) => (
        <div key={item.skillId} className="flex flex-col gap-2 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-base font-semibold text-brand-text">{item.name}</p>
            <p className="text-sm text-slate-500">
              {item.employeesWithSkillCount} чел. • средний уровень{" "}
              <span className={highlightWeak ? "text-red-600" : "text-emerald-600"}>
                {formatAverage(item.averageLevel)}/5
              </span>
            </p>
          </div>
          <span className="text-sm font-semibold text-slate-600">{formatAverage(item.averageLevel)}/5</span>
        </div>
      ))}
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="bg-white/70 text-sm text-slate-600">{message}</Card>
  );
}

function OverviewSkeleton() {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="animate-pulse space-y-4">
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="h-8 w-32 rounded bg-slate-200" />
          <div className="h-3 w-20 rounded bg-slate-200" />
        </Card>
      ))}
    </div>
  );
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card className="divide-y divide-brand-border p-0">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center justify-between px-6 py-4">
          <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
        </div>
      ))}
    </Card>
  );
}

function EmptyDashboardNotice() {
  return (
    <Card className="mt-4 bg-white/70 text-sm text-slate-600">
      Чтобы увидеть аналитику, добавьте в workspace сотрудников, навыки и хотя бы несколько оценок. После
      этого Quadrant построит агрегированную картину по команде.
    </Card>
  );
}

function renderLimit(max?: number | null) {
  if (!max || max <= 0) {
    return " / ∞";
  }
  return ` / ${max}`;
}

function formatLevel(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }
  return `${formatAverage(value)}/5`;
}

function formatAverage(value: number) {
  if (!Number.isFinite(value)) {
    return "0.0";
  }
  return value.toFixed(1);
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/common/Card";
import MetricCard from "@/components/app/MetricCard";
import PrimaryButton from "@/components/common/PrimaryButton";
import type {
  EmployeeRiskEntry,
  SkillAggregate,
  WorkspaceOverview,
} from "@/services/analyticsService";

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
};

export default function DashboardClient({ workspaceName, canManageBilling }: DashboardClientProps) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const overviewCards = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Сотрудники", value: data.overview.employeesCount },
      { label: "Навыки", value: data.overview.skillsCount },
      { label: "Треки", value: data.overview.tracksCount },
      { label: "Интеграции", value: data.overview.integrationsCount },
    ];
  }, [data]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 border-b border-brand-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Workspace</p>
          <h1 className="text-3xl font-semibold text-brand-text">{workspaceName}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Ключевые метрики команды: рост навыков, рисковые зоны и выполнение планов развития.
          </p>
        </div>
        {canManageBilling && (
          <PrimaryButton href="/app/settings?tab=billing">Перейти к тарифам</PrimaryButton>
        )}
      </div>

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
                    <PrimaryButton href="/app/settings?tab=billing" variant="secondary">
                      Открыть «Тариф и биллинг»
                    </PrimaryButton>
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

      <section data-testid="top-skills">
          <SectionHeading
            title="Сильные навыки"
            description="Навыки, где команда чувствует себя увереннее всего."
          />
        {loading && !data ? (
          <ListSkeleton />
        ) : data && data.topSkills.length > 0 ? (
          <SkillList items={data.topSkills} emptyLabel="Навыки появятся после добавления сотрудников" />
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
    <div className="mb-3">
      <h2 className="text-xl font-semibold text-brand-text">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  );
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
    <Card className="bg-slate-50 text-sm text-slate-600">
      {message}
    </Card>
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
    <Card className="mt-4 bg-slate-50 text-sm text-slate-600">
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

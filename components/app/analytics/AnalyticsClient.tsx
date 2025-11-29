"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { RiskItem, WorkspaceSkillMap } from "@/services/types/analytics";
import type { ActionItem } from "@/services/types/actionCenter";

const severityMeta: Record<
  RiskItem["severity"],
  { label: string; className: string; badgeClass: string }
> = {
  low: {
    label: "Низкий",
    className: "border-emerald-100 bg-emerald-50 text-emerald-800",
    badgeClass: "bg-emerald-50 text-emerald-700",
  },
  medium: {
    label: "Средний",
    className: "border-amber-100 bg-amber-50 text-amber-800",
    badgeClass: "bg-amber-50 text-amber-800",
  },
  high: {
    label: "Высокий",
    className: "border-red-100 bg-red-50 text-red-800",
    badgeClass: "bg-red-50 text-red-700",
  },
};

type AnalyticsClientProps = {
  workspaceName: string;
};

type SkillMapResponse = {
  ok: boolean;
  map: WorkspaceSkillMap;
};

type RisksResponse = {
  ok: boolean;
  risks: RiskItem[];
};

type OverviewResponse = {
  ok: boolean;
  overview: {
    skillGap?: {
      percentSatisfied: number;
      missingRatings: number;
      totalCombos: number;
    };
  };
};

export default function AnalyticsClient({ workspaceName }: AnalyticsClientProps) {
  const [skillMap, setSkillMap] = useState<WorkspaceSkillMap | null>(null);
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [skillGapSummary, setSkillGapSummary] = useState<OverviewResponse["overview"]["skillGap"] | null>(null);
  const [hrActions, setHrActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mapResponse, riskResponse, overviewResponse, actionsResponse] = await Promise.all([
        fetch("/api/app/analytics/skill-map", { cache: "no-store" }),
        fetch("/api/app/analytics/risks", { cache: "no-store" }),
        fetch("/api/app/analytics/overview", { cache: "no-store" }),
        fetch("/api/app/action-center", { cache: "no-store" }),
      ]);
      if (!mapResponse.ok) {
        throw new Error("Не удалось загрузить карту навыков");
      }
      if (!riskResponse.ok) {
        throw new Error("Не удалось загрузить риски");
      }
      if (!overviewResponse.ok) {
        throw new Error("Не удалось загрузить обзор");
      }
      const mapPayload = (await mapResponse.json()) as SkillMapResponse;
      const risksPayload = (await riskResponse.json()) as RisksResponse;
      const overviewPayload = (await overviewResponse.json()) as OverviewResponse;
      if (!mapPayload.ok) {
        throw new Error("Некорректный ответ сервера (skill-map)");
      }
      if (!risksPayload.ok) {
        throw new Error("Некорректный ответ сервера (risks)");
      }
      if (!overviewPayload.ok) {
        throw new Error("Некорректный ответ сервера (overview)");
      }
      const actionsPayload = (await actionsResponse.json().catch(() => null)) as { ok?: boolean; items?: ActionItem[] } | null;
      if (!mountedRef.current) return;
      setSkillMap(mapPayload.map);
      setRisks(risksPayload.risks);
      setSkillGapSummary(overviewPayload.overview.skillGap ?? null);
      if (actionsResponse.ok && actionsPayload?.ok && actionsPayload.items) {
        const companyLevel = actionsPayload.items.filter((a) =>
          ["system", "skill_gap", "onboarding", "feedback"].includes(a.source),
        );
        setHrActions(companyLevel.slice(0, 5));
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      if (!mountedRef.current) return;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    const check = async () => {
      try {
        const resp = await fetch("/api/app/onboarding/state", { cache: "no-store" });
        const json = await resp.json().catch(() => null);
        if (resp.ok && json?.state?.isCompleted === false) {
          setShowOnboardingBanner(true);
        }
      } catch {
        // ignore
      }
    };
    void check();
  }, []);

  const hasData = Boolean(skillMap && skillMap.totalEmployees > 0 && skillMap.skills.length > 0);

  const topSkills = useMemo(() => {
    if (!hasData || !skillMap) return [];
    return [...skillMap.skills].sort((a, b) => b.coverage - a.coverage).slice(0, 10);
  }, [hasData, skillMap]);

  const topRisks = useMemo(() => risks.slice(0, 5), [risks]);

  const nextActions = useMemo(() => buildActions(skillMap, topRisks), [skillMap, topRisks]);
  const teamPreview = useMemo(() => {
    if (!skillMap) return [];
    return skillMap.teams.filter((team) => Boolean(team.teamId)).slice(0, 4);
  }, [skillMap]);

  const renderContent = () => {
    if (loading && !skillMap) {
      return <AnalyticsSkeleton />;
    }
    if (error) {
      return (
        <Card className="border-red-200 bg-red-50 text-sm text-red-800">
          <p>{error}</p>
          <SecondaryButton onClick={() => void loadAnalytics()} className="mt-4 px-4 py-2 text-xs">
            Повторить загрузку
          </SecondaryButton>
        </Card>
      );
    }
    if (!hasData || !skillMap) {
      return (
        <Card className="bg-white/80 text-sm text-slate-600">
          Недостаточно данных, чтобы построить аналитику. Добавьте сотрудников и навыки, а затем обновите страницу.
        </Card>
      );
    }

    return (
      <>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Карта навыков</p>
              <h2 className="text-xl font-semibold text-brand-text">Покрытие компетенций</h2>
              <p className="text-sm text-slate-500">
                Quadrant нашёл {skillMap.totalSkills} навыков в workspace и {skillMap.totalEmployees} сотрудников.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-brand-border text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Навык</th>
                    <th className="px-3 py-2 text-left">Покрытие</th>
                    <th className="px-3 py-2 text-left">Bus factor</th>
                    <th className="px-3 py-2 text-left">Риск</th>
                  </tr>
                </thead>
                <tbody>
                  {topSkills.map((skill) => (
                    <tr key={skill.skillId} className="border-b border-brand-border/50">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-brand-text">{skill.name}</p>
                        <p className="text-xs text-slate-500">{skill.peopleCount} человек владеют</p>
                        <p className="text-xs text-slate-400">Артефактов: {skill.artifactCount}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {skill.coverage.toFixed(1)}% команды
                      </td>
                      <td className="px-3 py-3 text-slate-600">{skill.busFactor}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          severityMeta[skill.riskLevel].badgeClass
                        }`}>
                          {severityMeta[skill.riskLevel].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Топ-риски</p>
              <h2 className="text-xl font-semibold text-brand-text">Что может сгореть</h2>
              <p className="text-sm text-slate-500">Quadrant показывает навыки и команды без дублёров.</p>
            </div>
            <div className="space-y-4">
              {topRisks.length === 0 ? (
                <p className="text-sm text-slate-500">Сейчас критичных рисков не найдено.</p>
              ) : (
                topRisks.map((risk) => (
                  <div key={risk.id} className={`rounded-2xl border p-3 text-sm ${severityMeta[risk.severity].className}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{risk.title}</p>
                      <span className="text-xs font-semibold uppercase">{severityMeta[risk.severity].label}</span>
                    </div>
                    <p className="mt-2 text-xs opacity-90">{risk.description}</p>
                    {risk.teamId && (
                      <Link href={`/app/team/${risk.teamId}`} className="mt-2 inline-flex text-xs font-semibold text-brand-primary">
                        Открыть профиль команды →
                      </Link>
                    )}
                    {risk.affectedEmployees.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {risk.affectedEmployees.map((employee) => (
                          <Link
                            key={employee.employeeId}
                            href={`/app/employee/${employee.employeeId}`}
                            className="rounded-full bg-white/60 px-3 py-1 font-semibold text-brand-primary"
                          >
                            {employee.name}
                          </Link>
                        ))}
                      </div>
                    )}
                    <p className="mt-3 text-xs font-semibold opacity-80">{buildRecommendation(risk)}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {skillGapSummary && (
          <Card className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Skill Gap</p>
              <h2 className="text-xl font-semibold text-brand-text">Соответствие ролям</h2>
              <p className="text-sm text-slate-500">
                Процент сотрудников, которые закрывают требования по своим ролям, и где не хватает оценок.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 text-sm text-slate-700">
              <Card className="border-brand-border/60 bg-white/80 p-3 text-center shadow-none">
                <p className="text-xs uppercase tracking-wide text-slate-500">Соответствие</p>
                <p className="text-2xl font-semibold text-brand-text">{skillGapSummary.percentSatisfied}%</p>
              </Card>
              <Card className="border-brand-border/60 bg-white/80 p-3 text-center shadow-none">
                <p className="text-xs uppercase tracking-wide text-slate-500">Недостаёт оценок</p>
                <p className="text-2xl font-semibold text-brand-text">{skillGapSummary.missingRatings}</p>
                <p className="text-xs text-slate-500">комбинаций роль × навык</p>
              </Card>
              <Card className="border-brand-border/60 bg-white/80 p-3 text-center shadow-none">
                <p className="text-xs uppercase tracking-wide text-slate-500">Всего комбинаций</p>
                <p className="text-2xl font-semibold text-brand-text">{skillGapSummary.totalCombos}</p>
              </Card>
            </div>
            <div className="flex flex-wrap gap-3">
              <SecondaryButton href="/app/skills" className="px-3 py-2 text-xs">
                Настроить требования ролей
              </SecondaryButton>
              <PrimaryButton href="/app/skills" className="px-3 py-2 text-xs">
                Открыть Skill Gap
              </PrimaryButton>
            </div>
          </Card>
        )}

        {hrActions.length > 0 && (
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Action Center</p>
                <h2 className="text-xl font-semibold text-brand-text">Задачи уровня компании</h2>
              </div>
              <SecondaryButton href="/app/manager/agenda" className="px-3 py-2 text-xs">
                Открыть все
              </SecondaryButton>
            </div>
            <div className="space-y-2">
              {hrActions.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/70 bg-white/90 p-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Tag variant="outline">{mapActionType(item.type)}</Tag>
                      {item.dueDate && <span className="text-xs text-slate-500">до {new Date(item.dueDate).toLocaleDateString("ru-RU")}</span>}
                    </div>
                    <Link href={item.link} className="text-xs font-semibold text-brand-primary">
                      Перейти →
                    </Link>
                  </div>
                  <p className="mt-1 font-semibold text-brand-text">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {teamPreview.length > 0 && (
          <Card className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Команды</p>
              <h2 className="text-xl font-semibold text-brand-text">Срез по командам</h2>
              <p className="text-sm text-slate-500">Провалитесь в профиль, чтобы увидеть детали.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {teamPreview.map((team) => (
                <div key={team.teamId} className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <Link href={`/app/team/${team.teamId}`} className="font-semibold text-brand-primary">
                      {team.teamName}
                    </Link>
                    <span className="text-xs text-slate-500">{team.headcount} человек</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Навыков в риске: {team.risks.filter((risk) => risk.severity !== "low").length}
                  </p>
                  {team.dominantSkills.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      Сильные: {team.dominantSkills.map((skill) => skill.name).join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Действия для HR</p>
              <h2 className="text-xl font-semibold text-brand-text">Следующие шаги</h2>
              <p className="text-sm text-slate-500">
                Ключевые рекомендации на основе рисков и покрытия навыков.
              </p>
            </div>
            <PrimaryButton href="/app/analytics/staffing" className="px-5">
              Подбор команды под проект
            </PrimaryButton>
          </div>
          <div className="space-y-3">
            {nextActions.map((action, index) => (
              <div key={index} className="flex gap-3 rounded-2xl border border-white/60 bg-white/80 p-4 text-sm text-slate-600">
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-semibold text-brand-primary">
                  {index + 1}
                </span>
                <p className="text-brand-text">{action}</p>
              </div>
            ))}
            {nextActions.length === 0 && (
              <p className="rounded-2xl border border-white/60 bg-white/70 p-4 text-sm text-slate-500">
                Добавьте больше оценок по навыкам, чтобы Quadrant предложил конкретные шаги развития.
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-brand-border/70 bg-brand-muted/60 p-4 text-sm text-slate-600">
            <p>
              Нужен быстрый подбор? Используйте «Подбор команды» выше — Quadrant соберёт кандидатов и предупредит о рисках
              перетаскивания людей между командами.
            </p>
          </div>
        </Card>
      </>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Аналитика</p>
        <h1 className="text-3xl font-semibold text-brand-text">Аналитика команды</h1>
        <p className="mt-2 text-base text-slate-600">
          Карта навыков, риски и рекомендуемые действия для workspace «{workspaceName}».
        </p>
      </div>
      {showOnboardingBanner && (
        <Card className="border border-amber-200 bg-amber-50 text-sm text-amber-800">
          Мастер настройки компании не завершён. Перейдите в <a href="/app/setup" className="font-semibold text-amber-900 underline">/app/setup</a>, чтобы заполнить базовые данные.
        </Card>
      )}
      {renderContent()}
    </div>
  );
}

function mapActionType(type: ActionItem["type"]) {
  switch (type) {
    case "launch_program":
    case "launch_program_for_gap":
      return "Программы";
    case "fill_program_outcome":
    case "fill_pilot_outcome":
    case "close_program":
      return "Итоги";
    case "finish_onboarding":
      return "Онбординг";
    case "report":
      return "Отчёты";
    case "answer_survey":
      return "Опросы";
    default:
      return "Действие";
  }
}

function AnalyticsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="space-y-4">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-20 w-full animate-pulse rounded bg-slate-200" />
        </Card>
      ))}
    </div>
  );
}

function buildRecommendation(risk: RiskItem) {
  if (risk.kind === "skill") {
    return "Подготовьте ещё одного специалиста или запланируйте перенос знаний по этому навыку.";
  }
  if (risk.kind === "transition") {
    return "Проверьте, кого можно не трогать из текущих команд перед запуском проекта.";
  }
  if (risk.kind === "workload") {
    return "Пересмотрите загрузку ключевых людей, чтобы избежать выгорания.";
  }
  return "Синхронизируйте план развития с тимлидом этой команды.";
}

function buildActions(skillMap: WorkspaceSkillMap | null, risks: RiskItem[]) {
  const actions: string[] = [];
  if (risks.length > 0) {
    const firstRisk = risks[0];
    const firstSkill = firstRisk.affectedSkills?.[0];
    const skillName = skillMap?.skills.find((skill) => skill.skillId === firstSkill)?.name;
    actions.push(
      skillName
        ? `Назначьте менторство по навыку «${skillName}» и добавьте дублёра в ближайший квартал.`
        : "Пройдитесь по списку рисков и назначьте ответственных за передачу экспертизы.",
    );
  }
  if (skillMap && skillMap.teams.length > 0) {
    const weakestTeam = [...skillMap.teams].sort((a, b) => a.headcount - b.headcount)[0];
    if (weakestTeam) {
      actions.push(`Совместно с тимлидом ${weakestTeam.teamName} определите, какие навыки нужно усилить.`);
    }
  }
  actions.push(
    "Используйте аналитику сотрудника (кнопка в разделе «Команда»), чтобы подобрать замену ключевым людям и план развития.",
  );
  return actions.slice(0, 4);
}

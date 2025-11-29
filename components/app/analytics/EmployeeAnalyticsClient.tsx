"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type {
  EmployeeRiskProfile,
  GrowthPathSuggestion,
  ReplacementCandidate,
} from "@/services/types/analytics";

type SkillProfile = {
  id: string;
  name: string;
  level: number;
};

type EmployeeSummary = {
  id: string;
  name: string;
  position: string;
  level: string;
  trackName: string | null;
  trackLevelName: string | null;
};

type MobilityResponse = {
  replacements: ReplacementCandidate[];
  growth: GrowthPathSuggestion[];
  riskProfile: EmployeeRiskProfile;
};

type EmployeeAnalyticsClientProps = {
  employee: EmployeeSummary;
  skills: SkillProfile[];
};

export default function EmployeeAnalyticsClient({ employee, skills }: EmployeeAnalyticsClientProps) {
  const [data, setData] = useState<MobilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchMobility = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/app/analytics/employee/${employee.id}/mobility`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as (MobilityResponse & { ok?: boolean; error?: { message?: string } }) | null;
      if (!response.ok || !payload) {
        throw new Error(payload?.error?.message ?? "Не удалось загрузить аналитику сотрудника");
      }
      if (!mountedRef.current) return;
      setData({
        replacements: payload.replacements,
        growth: payload.growth,
        riskProfile: payload.riskProfile,
      });
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
      setData(null);
    } finally {
      if (!mountedRef.current) return;
      setLoading(false);
    }
  }, [employee.id]);

  useEffect(() => {
    void fetchMobility();
  }, [fetchMobility]);

  const sortedSkills = useMemo(() => skills.slice().sort((a, b) => b.level - a.level || a.name.localeCompare(b.name)), [skills]);

  const replacements = data?.replacements ?? [];
  const growthPaths = data?.growth ?? [];
  const riskProfile = data?.riskProfile;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Мобильность</p>
          <h1 className="text-3xl font-semibold text-brand-text">{employee.name}</h1>
          <p className="text-base text-slate-600">
            {employee.position} · {employee.level} · {employee.trackName ?? "Без трека"}
            {employee.trackLevelName ? ` (${employee.trackLevelName})` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton href="/app/team" className="px-4 py-2">
            Назад к команде
          </SecondaryButton>
          <PrimaryButton onClick={() => void fetchMobility()} disabled={loading} className="px-4 py-2">
            Обновить данные
          </PrimaryButton>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 text-sm text-red-800">
          {error}
        </Card>
      )}

      <Card className="space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Профиль навыков</p>
            <h2 className="text-xl font-semibold text-brand-text">Навыки и уровень владения</h2>
            <p className="text-sm text-slate-500">Quadrant использует эти данные для подбора замен и планов роста.</p>
          </div>
          {riskProfile && (
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-primary/10 px-4 py-2 text-sm font-semibold text-brand-primary">
              Риск-score: {riskProfile.riskScore}
            </span>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {sortedSkills.length > 0 ? (
            sortedSkills.map((skill) => (
              <div key={skill.id} className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/80 px-4 py-3">
                <div>
                  <p className="font-semibold text-brand-text">{skill.name}</p>
                  <p className="text-xs text-slate-500">Оценка {skill.level}/5</p>
                </div>
                <Tag>{skill.level}/5</Tag>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">Для сотрудника ещё не указаны навыки.</p>
          )}
        </div>
        {riskProfile && riskProfile.criticalSkills.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Этот человек покрывает критичные навыки:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {riskProfile.criticalSkills.map((risk) => (
                <li key={risk.id}>{risk.title}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Замены</p>
            <h2 className="text-xl font-semibold text-brand-text">Кого можно подменить</h2>
            <p className="text-sm text-slate-500">Сортировка по степени совпадения навыков и уровню.</p>
          </div>
          {loading && !data ? (
            <p className="text-sm text-slate-500">Загружаем кандидатов...</p>
          ) : replacements.length === 0 ? (
            <p className="text-sm text-slate-500">Пока не удалось найти подходящих кандидатов.</p>
          ) : (
            <div className="space-y-3">
              {replacements.map((candidate) => (
                <div key={candidate.employeeId} className="rounded-2xl border border-white/60 bg-white/90 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-brand-text">{candidate.name}</p>
                      <p className="text-xs text-slate-500">{candidate.position}</p>
                    </div>
                    <span className="text-sm font-semibold text-brand-primary">
                      Сходство {candidate.similarityScore}%
                    </span>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">Совпадающие навыки</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {candidate.sharedSkills.length > 0 ? (
                      candidate.sharedSkills.map((skill) => (
                        <Tag key={skill.skillId}>{skill.name} · {skill.level}/5</Tag>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">Нет прямых совпадений</span>
                    )}
                  </div>
                  {candidate.missingSkills.length > 0 && (
                    <p className="mt-2 text-xs text-slate-500">
                      Нужно подтянуть: {candidate.missingSkills.map((skill) => skill.name).join(", ")}
                    </p>
                  )}
                  <div className="mt-2 text-xs text-slate-500">
                    Режим: {candidate.readiness === "ready" ? "готов заменить" : "stretch-задача"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Рост</p>
            <h2 className="text-xl font-semibold text-brand-text">Как развивать сотрудника</h2>
            <p className="text-sm text-slate-500">Недостающие навыки до целевых ролей.</p>
          </div>
          {loading && !data ? (
            <p className="text-sm text-slate-500">Считаем рекомендации...</p>
          ) : growthPaths.length === 0 ? (
            <p className="text-sm text-slate-500">Добавьте больше оценок, чтобы Quadrant подсказал роли роста.</p>
          ) : (
            <div className="space-y-3">
              {growthPaths.map((path) => (
                <div key={path.targetRoleId} className="rounded-2xl border border-white/60 bg-white/90 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-brand-text">{path.targetRoleName}</p>
                      <p className="text-xs text-slate-500">Готовность {(path.readinessScore * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">Что подтянуть</p>
                  {path.missingSkills.length > 0 ? (
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-600">
                      {path.missingSkills.map((skill) => (
                        <li key={`${path.targetRoleId}-${skill.name}`}>
                          {skill.name} · нужно до уровня {skill.targetLevel}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">Навыки уже соответствуют требованиям.</p>
                  )}
                  {path.recommendedActions.length > 0 && (
                    <div className="mt-3 rounded-2xl bg-brand-muted/60 p-3 text-xs text-slate-600">
                      {path.recommendedActions.map((action) => (
                        <p key={action}>• {action}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {riskProfile && (
        <Card className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Дополнительно</p>
          <h2 className="text-xl font-semibold text-brand-text">Риски по сотруднику</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {riskProfile.criticalSkills.map((risk) => (
              <div key={risk.id} className="rounded-2xl border border-white/60 bg-white/90 p-4 text-sm text-slate-600">
                <p className="font-semibold text-brand-text">{risk.title}</p>
                <p className="mt-1 text-xs">{risk.description}</p>
              </div>
            ))}
            {riskProfile.criticalSkills.length === 0 && (
              <p className="text-sm text-slate-500">Критичных рисков для этого сотрудника нет.</p>
            )}
          </div>
          <Link href="/app/analytics/staffing" className="inline-flex text-sm font-semibold text-brand-primary">
            Подобрать команду под проект →
          </Link>
        </Card>
      )}
    </div>
  );
}

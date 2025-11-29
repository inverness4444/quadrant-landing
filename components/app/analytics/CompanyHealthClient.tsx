"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Card from "@/components/common/Card";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";

type Snapshot = Awaited<ReturnType<typeof import("@/services/analyticsService").getCompanyHealthSnapshot>>;

export default function CompanyHealthClient({ workspaceName }: { workspaceName: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/app/analytics/health/company", { cache: "no-store" });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || !json?.ok) throw new Error(json?.error?.message ?? "Не удалось загрузить срез здоровья");
      setSnapshot(json.snapshot as Snapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Company Health</p>
          <h1 className="text-3xl font-semibold text-brand-text">Состояние компании</h1>
          <p className="text-sm text-slate-600">Сводка по развитию и вовлечённости для {workspaceName}.</p>
        </div>
        <div className="flex gap-2">
          <SecondaryButton href="/api/app/analytics/health/company/export?format=csv" className="px-3 py-2 text-xs">
            Скачать CSV
          </SecondaryButton>
          <SecondaryButton onClick={() => void load()} className="px-3 py-2 text-xs" disabled={loading}>
            Обновить
          </SecondaryButton>
        </div>
      </div>

      {error && <Card className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>}
      {loading && !snapshot && <Card className="p-3 text-sm text-slate-500">Загружаем…</Card>}
      {!loading && !error && snapshot && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Программы</p>
              <p className="text-2xl font-semibold text-brand-text">{snapshot.programs.active} активных</p>
              <p className="text-sm text-slate-600">
                Всего: {snapshot.programs.total} · Завершено: {snapshot.programs.completed} · Итоги: {snapshot.programs.withOutcomes}
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-brand-primary/70"
                  style={{
                    width: snapshot.programs.total > 0 ? `${(snapshot.programs.completed / snapshot.programs.total) * 100}%` : "0%",
                  }}
                />
              </div>
            </Card>
            <Card className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Skill Gap</p>
              <p className="text-2xl font-semibold text-brand-text">
                {snapshot.skillGap.fullyCoveredEmployeesPct !== null
                  ? `${snapshot.skillGap.fullyCoveredEmployeesPct}% закрывают требования`
                  : "Недостаточно данных"}
              </p>
              <p className="text-sm text-slate-600">Ролей: {snapshot.skillGap.rolesTracked} · Навыков без оценок: {snapshot.skillGap.skillsWithoutRatings}</p>
            </Card>
            <Card className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Опросы и 1:1</p>
              <p className="text-2xl font-semibold text-brand-text">Опросов: {snapshot.feedback.activeSurveys}</p>
              <p className="text-sm text-slate-600">Средний response rate: {snapshot.feedback.avgResponseRate ?? "—"}%</p>
              <p className="text-sm text-slate-600">1:1 за 30д: {snapshot.oneOnOnes.last30dCount}</p>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Цели развития</p>
              <p className="text-2xl font-semibold text-brand-text">Активных: {snapshot.goals.activeGoals}</p>
              <p className="text-sm text-slate-600">
                Просрочено: {snapshot.goals.overdueGoals} · Завершено за 30д: {snapshot.goals.completedLast30d}
              </p>
            </Card>
            <Card className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Отчёты</p>
              <p className="text-2xl font-semibold text-brand-text">{snapshot.reports.lastQuarterLabel ?? "Нет отчётов"}</p>
              <p className="text-sm text-slate-600">Текущий квартал: {snapshot.reports.hasCurrentQuarterDraft ? "в работе" : "не создан"}</p>
              <Link href="/app/reports/quarterly" className="text-sm font-semibold text-brand-primary">
                Открыть отчёты →
              </Link>
            </Card>
          </div>

          <Card className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Outcomes</p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-700">
              <Tag>Программ с итогами: {snapshot.outcomes.programsWithOutcomes}</Tag>
              <Tag>Пилотов с итогами: {snapshot.outcomes.pilotsWithOutcomes}</Tag>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

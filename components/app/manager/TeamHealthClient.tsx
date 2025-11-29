"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/common/Card";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { ActionItem } from "@/services/types/actionCenter";

type Snapshot = Awaited<ReturnType<typeof import("@/services/analyticsService").getTeamHealthSnapshot>>;

export default function TeamHealthClient() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthResp, actionsResp] = await Promise.all([
        fetch("/api/app/analytics/health/team", { cache: "no-store" }),
        fetch("/api/app/action-center", { cache: "no-store" }),
      ]);
      const healthJson = await healthResp.json().catch(() => null);
      const actionsJson = await actionsResp.json().catch(() => null);
      if (!healthResp.ok || !healthJson?.ok) throw new Error(healthJson?.error?.message ?? "Не удалось загрузить данные команды");
      setSnapshot(healthJson.snapshot as Snapshot);
      if (actionsResp.ok && actionsJson?.ok && Array.isArray(actionsJson.items)) {
        setActions(actionsJson.items.slice(0, 5));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const criticalSkills = useMemo(() => snapshot?.skillGap.criticalSkills ?? [], [snapshot]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Team Health</p>
          <h1 className="text-3xl font-semibold text-brand-text">Состояние команды</h1>
          <p className="text-sm text-slate-600">Быстрый обзор по программе, целям и скиллам вашей команды.</p>
        </div>
        <div className="flex gap-2">
          <SecondaryButton href="/api/app/analytics/health/team/export?format=csv" className="px-3 py-2 text-xs">
            Скачать CSV
          </SecondaryButton>
          <SecondaryButton onClick={() => void load()} className="px-3 py-2 text-xs" disabled={loading}>
            Обновить
          </SecondaryButton>
        </div>
      </div>

      {error && <Card className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>}
      {loading && !snapshot && <Card className="p-3 text-sm text-slate-500">Загружаем…</Card>}

      {snapshot && (
        <div className="space-y-6">
          <Card className="grid gap-3 md:grid-cols-3">
            {renderStat("Размер команды", snapshot.teamSize)}
            {renderStat("Активных программ", snapshot.programs.activeForTeam)}
            {renderStat("Сотрудников без целей", snapshot.goals.employeesWithoutGoals)}
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Skill Gap</p>
                <h2 className="text-xl font-semibold text-brand-text">Критичные навыки</h2>
              </div>
              <SecondaryButton href="/app/skills" className="px-3 py-1 text-xs">
                Открыть матрицу
              </SecondaryButton>
            </div>
            {criticalSkills.length === 0 ? (
              <p className="text-sm text-slate-500">Критичных навыков не найдено или не хватает данных.</p>
            ) : (
              <div className="space-y-2">
                {criticalSkills.map((skill) => (
                  <div key={skill.skillId} className="rounded-2xl border border-white/70 bg-white/90 p-3 text-sm text-slate-700">
                    <p className="font-semibold text-brand-text">
                      {skill.name ?? skill.skillId} · gap {skill.avgGap.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">Затронуто сотрудников: {skill.affectedEmployees}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Action Center</p>
                <h2 className="text-xl font-semibold text-brand-text">Приоритетные действия</h2>
              </div>
              <SecondaryButton href="/app/manager/agenda" className="px-3 py-1 text-xs">
                Повестка
              </SecondaryButton>
            </div>
            {actions.length === 0 ? (
              <p className="text-sm text-slate-500">Нет приоритетных задач на этой неделе.</p>
            ) : (
              <div className="space-y-2">
                {actions.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/70 bg-white/90 p-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <Tag variant="outline">{mapActionType(item.type)}</Tag>
                      <Link href={item.link} className="text-xs font-semibold text-brand-primary">
                        Перейти →
                      </Link>
                    </div>
                    <p className="mt-1 font-semibold text-brand-text">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function renderStat(label: string, value: number | string) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-brand-text">{value}</p>
    </div>
  );
}

function mapActionType(type: ActionItem["type"]) {
  switch (type) {
    case "run_1_1":
      return "1:1";
    case "create_goal":
      return "Цели";
    case "close_program":
      return "Программы";
    case "answer_survey":
      return "Опросы";
    default:
      return "Действие";
  }
}


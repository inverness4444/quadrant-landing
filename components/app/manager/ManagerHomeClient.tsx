"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type {
  ManagerHomeActionItem,
  ManagerHomeEmployeeCard,
  ManagerHomeMeetingItem,
  ManagerHomeSummary,
} from "@/services/managerHomeService";

export default function ManagerHomeClient() {
  const [data, setData] = useState<{
    summary: ManagerHomeSummary;
    employees: ManagerHomeEmployeeCard[];
    upcomingMeetings: ManagerHomeMeetingItem[];
    actions: ManagerHomeActionItem[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/app/manager/home", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось загрузить данные");
      }
      setData({
        summary: payload.summary,
        employees: payload.employees ?? [],
        upcomingMeetings: payload.upcomingMeetings ?? [],
        actions: payload.actions ?? [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  const sortedActions = useMemo(() => {
    if (!data?.actions) return [];
    const weight = { high: 0, medium: 1, low: 2 } as const;
    return [...data.actions].sort((a, b) => weight[a.priority] - weight[b.priority]);
  }, [data?.actions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Manager</p>
          <h1 className="text-3xl font-semibold text-brand-text">Кабинет руководителя</h1>
          <p className="text-sm text-slate-600">Коротко: команда, риски, пилоты, действия на неделю.</p>
        </div>
        <div className="flex gap-2">
          <SecondaryButton href={`/app/reports/quarterly?year=${new Date().getUTCFullYear()}&quarter=${Math.floor(new Date().getUTCMonth() / 3) + 1}`} className="px-4 py-2">
            Квартальный отчёт
          </SecondaryButton>
          <SecondaryButton href="/app/agenda" className="px-4 py-2">
            Повестка на неделю
          </SecondaryButton>
          <SecondaryButton href="/app/manager/agenda" className="px-4 py-2">
            Открыть повестку
          </SecondaryButton>
          <SecondaryButton onClick={() => void load()} disabled={loading} className="px-4 py-2">
            Обновить
          </SecondaryButton>
        </div>
      </div>

      {error && <Card className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>}

      <Card className="grid gap-3 md:grid-cols-5">
        {renderStat("Команда", data?.summary.teamName ?? "Не назначена", data?.summary.headcount ?? "…")}
        {renderStat(
          "Пилоты",
          data ? `${data.summary.pilotsActive} активных / ${data.summary.pilotsTotal}` : "…",
          data?.summary.pilotsCompleted ?? "…",
          "Завершено (12 нед)",
        )}
        {renderStat("Риски", data?.summary.employeesAtRisk ?? "…")}
        {renderStat("Решения", data?.summary.openDecisions ?? "…")}
        {renderStat("Встречи 14д", data?.summary.upcomingMeetingsCount ?? "…")}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Что требует внимания</p>
            <h2 className="text-xl font-semibold text-brand-text">Приоритеты недели</h2>
          </div>
        </div>
        {loading && <p className="text-sm text-slate-500">Загрузка…</p>}
        {!loading && sortedActions.length === 0 && <p className="text-sm text-slate-500">Нет срочных действий.</p>}
        <div className="space-y-2">
          {sortedActions.map((action) => (
            <div key={action.id} className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Tag variant="outline">{formatActionKind(action.kind)}</Tag>
                  <Tag variant="outline" className={action.priority === "high" ? "border-red-300 text-red-700" : ""}>
                    {action.priority.toUpperCase()}
                  </Tag>
                </div>
                <div className="flex flex-wrap gap-2">
                  {action.decisionId && <PrimaryButton href="/app/decisions" className="px-3 py-1 text-xs">Открыть решения</PrimaryButton>}
                  {(action.url || action.pilotId) && (
                    <PrimaryButton href={action.url ?? `/app/pilots/${action.pilotId}`} className="px-3 py-1 text-xs">
                      Пилот
                    </PrimaryButton>
                  )}
                  {action.employeeId && <SecondaryButton href={`/app/employee/${action.employeeId}`} className="px-3 py-1 text-xs">Профиль</SecondaryButton>}
                </div>
              </div>
              <p className="mt-1 font-semibold text-brand-text">{action.label}</p>
              {action.description && <p className="text-xs text-slate-500">{action.description}</p>}
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Команда</p>
            <h2 className="text-xl font-semibold text-brand-text">Люди</h2>
          </div>
          <SecondaryButton href="/app/team" className="px-3 py-1 text-xs">
            Все сотрудники
          </SecondaryButton>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Сотрудник</th>
                <th className="px-3 py-2">Роль</th>
                <th className="px-3 py-2">Статусы</th>
                <th className="px-3 py-2">Пилоты</th>
                <th className="px-3 py-2">Решения</th>
                <th className="px-3 py-2 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {(data?.employees ?? []).map((emp) => (
                <tr key={emp.employeeId} className="border-t border-brand-border/60">
                  <td className="px-3 py-3">
                    <a href={`/app/employee/${emp.employeeId}`} className="font-semibold text-brand-primary">
                      {emp.employeeName}
                    </a>
                  </td>
                  <td className="px-3 py-3">{emp.roleTitle ?? "–"}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {emp.isAtRisk && <Tag variant="outline" className="border-red-300 text-red-700">В риске</Tag>}
                      {emp.isHighPotential && <Tag variant="outline" className="border-emerald-300 text-emerald-700">High potential</Tag>}
                    </div>
                  </td>
                  <td className="px-3 py-3">{emp.inActivePilotsCount}</td>
                  <td className="px-3 py-3">{emp.openDecisionsCount}</td>
                  <td className="px-3 py-3 text-right space-x-2">
                    <SecondaryButton href={`/app/employee/${emp.employeeId}`} className="px-3 py-1 text-xs">
                      Профиль
                    </SecondaryButton>
                    <SecondaryButton href="/app/decisions" className="px-3 py-1 text-xs">
                      Решения
                    </SecondaryButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.employees?.length === 0 && <p className="text-sm text-slate-500">Сотрудники не найдены.</p>}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Ближайшие встречи</p>
            <h2 className="text-xl font-semibold text-brand-text">Встречи (14 дней)</h2>
          </div>
          <SecondaryButton href="/app/meetings" className="px-3 py-1 text-xs">
            Все встречи
          </SecondaryButton>
        </div>
        {data?.upcomingMeetings?.length ? (
          <div className="space-y-2">
            {data.upcomingMeetings.map((m) => (
              <div key={m.meetingId} className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-text">{m.title}</p>
                    <p className="text-xs text-slate-500">{new Date(m.date).toLocaleString("ru-RU")}</p>
                    <p className="text-xs text-slate-500">Тип: {formatMeetingType(m.type)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Встреч нет.</p>
        )}
      </Card>
    </div>
  );
}

function renderStat(label: string, value: number | string, extra?: number | string, extraLabel?: string) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/90 p-3">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="text-2xl font-semibold text-brand-text">{value}</p>
      {extra !== undefined && <p className="text-xs text-slate-500">{extraLabel ? `${extraLabel}: ${extra}` : extra}</p>}
    </div>
  );
}

function formatActionKind(kind: ManagerHomeActionItem["kind"]) {
  const map: Record<ManagerHomeActionItem["kind"], string> = {
    close_decision: "Закрыть решение",
    schedule_one_to_one: "Назначить 1:1",
    review_pilot: "Ревью пилота",
    pilot_add_participants: "Добавить участников",
    check_risk: "Проверить риск",
    update_skills: "Обновить навыки",
    development_goal: "План развития",
    quarterly_report_prepare: "Квартальный отчёт",
    quarterly_report_review: "Квартальный отчёт",
    one_on_one_today: "1:1",
    feedback_due: "Опрос",
  };
  return map[kind] ?? kind;
}

function formatMeetingType(type: ManagerHomeMeetingItem["type"]) {
  const map: Record<ManagerHomeMeetingItem["type"], string> = {
    one_to_one: "1:1",
    team: "Командная",
    pilot_review: "Ревью пилота",
    other: "Другое",
  };
  return map[type] ?? type;
}

"use client";

import { useEffect, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import type { DashboardActionItem, DashboardData } from "@/services/types/dashboard";

type DashboardClientProps = {
  workspaceName: string;
};

export default function DashboardClient({ workspaceName }: DashboardClientProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/app/dashboard", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось загрузить дашборд");
      }
      setData(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  const summaryCards = [
    { label: "Активные пилоты", value: data?.summary.activePilots ?? 0 },
    { label: "Пилоты в риске", value: data?.summary.pilotsAtRisk ?? 0 },
    { label: "Команды", value: data?.summary.totalTeams ?? 0 },
    { label: "Сотрудники", value: data?.summary.totalEmployees ?? 0 },
    { label: "Встречи (7 дней)", value: data?.summary.upcomingMeetingsCount ?? 0 },
    { label: "Старые отчёты", value: data?.summary.staleReportsCount ?? 0 },
    { label: "Непрочитанные уведомления", value: data?.summary.unreadNotificationsCount ?? 0 },
    { label: "Открытые решения", value: data?.summary.openDecisionsCount ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Дашборд</p>
          <h1 className="text-3xl font-semibold text-brand-text">Workspace «{workspaceName}»</h1>
          <p className="text-sm text-slate-600">Ключевые пилоты, встречи и действия на этой неделе.</p>
        </div>
        <div className="flex gap-2">
          <SecondaryButton onClick={() => void load()} className="px-4 py-2" disabled={loading}>
            Обновить
          </SecondaryButton>
        </div>
      </div>

      {error && <Card className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>}

      <div className="grid gap-4 md:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.label} className="p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{card.label}</p>
            <p className="text-2xl font-semibold text-brand-text">{loading ? "…" : card.value}</p>
          </Card>
        ))}
      </div>

      <Card className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Решения по людям</p>
          <h2 className="text-xl font-semibold text-brand-text">Открытых решений: {loading ? "…" : data?.summary.openDecisionsCount ?? 0}</h2>
          <p className="text-sm text-slate-500">Повышения, переводы, мониторинг рисков удержания.</p>
        </div>
        <PrimaryButton href="/app/decisions" className="px-4 py-2">
          Открыть борд решений
        </PrimaryButton>
      </Card>

      <Card className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Навыки и разрывы</p>
          <h2 className="text-xl font-semibold text-brand-text">Skills & Gaps Explorer</h2>
          <p className="text-sm text-slate-500">Матрица навыков, разрывы к ролям, быстрые решения.</p>
        </div>
        <PrimaryButton href="/app/skills/map" className="px-4 py-2">
          Открыть обзор
        </PrimaryButton>
      </Card>

      <Card className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Quarterly report</p>
          <h2 className="text-xl font-semibold text-brand-text">Люди и навыки за квартал</h2>
          <p className="text-sm text-slate-500">Краткий обзор прогресса: пилоты, решения, риски.</p>
        </div>
        <PrimaryButton href="/app/reports/quarterly" className="px-4 py-2">
          Открыть отчёт
        </PrimaryButton>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Пилоты</p>
            <h2 className="text-xl font-semibold text-brand-text">Пилоты в зоне риска</h2>
            <p className="text-sm text-slate-500">Просроченные шаги и владельцы.</p>
          </div>
          <SecondaryButton href="/app/pilot" className="px-3 py-1 text-xs">
            Все пилоты
          </SecondaryButton>
        </div>
        {data?.pilotsAtRisk?.length ? (
          <div className="space-y-2">
            {data.pilotsAtRisk.map((pilot) => (
              <div key={pilot.pilotRunId} className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-text">{pilot.name}</p>
                    <p className="text-xs text-slate-500">
                      {pilot.teamName ?? "Команда не указана"} · Владелец: {pilot.ownerName ?? "не указан"}
                    </p>
                  </div>
                  <div className="text-right text-xs text-amber-700">
                    <p>Просрочено шагов: {pilot.overdueSteps}</p>
                    <PrimaryButton href={`/app/pilot/${pilot.pilotRunId}`} className="mt-2 px-3 py-1 text-xs">
                      Открыть
                    </PrimaryButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Сейчас нет пилотов в зоне риска.</p>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Встречи</p>
            <h2 className="text-xl font-semibold text-brand-text">Ближайшие встречи</h2>
          </div>
          <SecondaryButton href="/app/meetings" className="px-3 py-1 text-xs">
            Все встречи
          </SecondaryButton>
        </div>
        {data?.upcomingMeetings?.length ? (
          <div className="space-y-2">
            {data.upcomingMeetings.map((meeting) => (
              <div key={meeting.agendaId} className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-text">{meeting.title}</p>
                    <p className="text-xs text-slate-500">
                      {meeting.scheduledAt instanceof Date ? meeting.scheduledAt.toLocaleString("ru-RU") : new Date(meeting.scheduledAt).toLocaleString("ru-RU")} · Владелец:{" "}
                      {meeting.ownerName ?? "не указан"}
                    </p>
                    {meeting.relatedPilotName && <p className="text-xs text-slate-500">Пилот: {meeting.relatedPilotName}</p>}
                  </div>
                  <PrimaryButton href={`/app/meetings/${meeting.agendaId}`} className="px-3 py-1 text-xs">
                    Открыть повестку
                  </PrimaryButton>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">На ближайшую неделю встречи не запланированы.</p>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Действия</p>
            <h2 className="text-xl font-semibold text-brand-text">Важные действия</h2>
            <p className="text-sm text-slate-500">Просроченные шаги, встречи, отчёты, системные напоминания.</p>
          </div>
          <SecondaryButton href="/app/notifications" className="px-3 py-1 text-xs">
            Все уведомления
          </SecondaryButton>
        </div>
        {data?.actionItems?.length ? (
          <div className="space-y-2">
            {data.actionItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">{formatActionType(item.type)}</p>
                    <p className="font-semibold text-brand-text">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.body}</p>
                    <p className="text-[11px] text-slate-400">
                      {item.createdAt instanceof Date ? item.createdAt.toLocaleString("ru-RU") : new Date(item.createdAt).toLocaleString("ru-RU")}
                    </p>
                  </div>
                  {item.url && (
                    <PrimaryButton href={item.url} className="px-3 py-1 text-xs">
                      Перейти
                    </PrimaryButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">На сегодня нет срочных действий.</p>
        )}
      </Card>
    </div>
  );
}

function formatActionType(type: DashboardActionItem["type"]) {
  const map: Record<DashboardActionItem["type"], string> = {
    pilot_step_due: "Пилот",
    meeting_upcoming: "Встреча",
    report_stale: "Отчёт",
    system: "Система",
  };
  return map[type] ?? type;
}

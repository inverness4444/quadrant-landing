"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Card from "@/components/common/Card";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import PrimaryButton from "@/components/common/PrimaryButton";
import type {
  ManagerCommandCenterSnapshot,
  ManagerPilotHighlight,
  ManagerRiskHighlight,
  ManagerUpcomingItem,
} from "@/services/managerCommandCenterService";
import type { ActionItem } from "@/services/types/actionCenter";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: ManagerCommandCenterSnapshot };

export default function ManagerCommandCenterClient({ focus }: { focus?: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [onboardingBanner, setOnboardingBanner] = useState(false);
  const [actions, setActions] = useState<ActionItem[]>([]);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const response = await fetch("/api/app/onboarding/state", { cache: "no-store" });
        const json = await response.json().catch(() => null);
        if (response.ok && json?.state?.isCompleted === false) {
          setOnboardingBanner(true);
        }
      } catch {
        // ignore
      }
    };
    void checkOnboarding();
  }, []);

  useEffect(() => {
    if (!focus) return;
    const el = document.querySelector(`[data-block='${focus}']`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focus, state]);

  const load = async () => {
    setState({ kind: "loading" });
    try {
      const [ccResponse, actionsResponse] = await Promise.all([
        fetch("/api/app/manager/command-center", { cache: "no-store" }),
        fetch("/api/app/action-center", { cache: "no-store" }),
      ]);
      const payload = (await ccResponse.json().catch(() => null)) as unknown;
      if (!ccResponse.ok || !payload || isErrorPayload(payload)) {
        const message = isErrorPayload(payload) ? payload.error?.message : undefined;
        throw new Error(message ?? "Не удалось загрузить данные менеджера");
      }
      const actionsJson = (await actionsResponse.json().catch(() => null)) as { ok?: boolean; items?: ActionItem[] } | null;
      const snapshot = normalizeSnapshot(payload as ManagerCommandCenterSnapshot);
      setState({ kind: "ready", data: snapshot });
      if (actionsResponse.ok && actionsJson?.ok && Array.isArray(actionsJson.items)) {
        setActions(actionsJson.items);
      }
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : "Неизвестная ошибка" });
    }
  };

  const summary = state.kind === "ready" ? state.data.summary : null;
  const upcoming = useMemo(() => (state.kind === "ready" ? state.data.upcoming : []), [state]);
  const risks = useMemo(() => (state.kind === "ready" ? state.data.risks : []), [state]);
  const pilots = useMemo(() => (state.kind === "ready" ? state.data.pilots : []), [state]);
  const notifications = useMemo(() => (state.kind === "ready" ? state.data.notifications : []), [state]);
  const filteredActions = useMemo(() => actions.slice(0, 8), [actions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Manager Home</p>
          <h1 className="text-3xl font-semibold text-brand-text">Командный центр менеджера</h1>
          <p className="text-sm text-slate-600">Ключевые метрики, риски, пилоты и ближайшие задачи — в одном экране.</p>
        </div>
        <div className="flex gap-2">
          <SecondaryButton href="/app/analytics" className="px-4 py-2">
            Аналитика
          </SecondaryButton>
          <SecondaryButton href="/app/manager/agenda" className="px-4 py-2">
            Повестка
          </SecondaryButton>
          <SecondaryButton href="/app/manager/health" className="px-4 py-2">
            Отчёт по команде
          </SecondaryButton>
          <SecondaryButton href="/app/notifications" className="px-4 py-2">
            Уведомления
          </SecondaryButton>
          <SecondaryButton onClick={() => void load()} className="px-4 py-2">
            Обновить
          </SecondaryButton>
        </div>
      </div>

      {onboardingBanner && (
        <Card className="border border-amber-200 bg-amber-50 text-sm text-amber-800">
          Настройка компании не завершена. Пройдите мастер настройки в{" "}
          <Link href="/app/setup" className="font-semibold text-amber-900 underline">
            /app/setup
          </Link>
          .
        </Card>
      )}

      {state.kind === "error" && <Card className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.message}</Card>}

      <Card className="grid gap-3 md:grid-cols-4" data-block="summary">
        {renderStat("Сотрудников в команде", summary?.employeesTotal ?? "…")}
        {renderStat("В зоне риска", summary?.employeesAtRisk ?? "…", "Исполняете роль владельца кейсов")}
        {renderStat("Активных пилотов", summary?.pilotsActive ?? "…", `Из шаблонов: ${summary?.pilotsFromTemplates ?? 0}`)}
        {renderStat("Просроченные шаги", summary?.pilotStepsOverdue ?? "…")}
      </Card>

      <Card className="space-y-3" data-block="actions">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Action Center</p>
            <h2 className="text-xl font-semibold text-brand-text">Что сделать на этой неделе</h2>
          </div>
          <PrimaryButton href="/app/agenda" className="px-3 py-1 text-xs">
            Открыть повестку
          </PrimaryButton>
        </div>
        {filteredActions.length === 0 ? (
          <p className="text-sm text-slate-500">Критичных действий нет. Можно сосредоточиться на текущих задачах.</p>
        ) : (
          <div className="space-y-2">
            {filteredActions.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/70 bg-white/90 p-3 text-sm text-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Tag variant="outline">{mapType(item.type)}</Tag>
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
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2" data-block="upcoming">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Ближайшие задачи</p>
              <h2 className="text-xl font-semibold text-brand-text">Сегодня и 7 дней</h2>
            </div>
            <SecondaryButton href="/app/manager/agenda" className="px-3 py-1 text-xs">
              Вся повестка
            </SecondaryButton>
          </div>
          {state.kind === "loading" && <p className="text-sm text-slate-500">Загружаем задачи…</p>}
          {state.kind === "ready" && upcoming.length === 0 && <p className="text-sm text-slate-500">Нет задач на ближайшие дни.</p>}
          <div className="space-y-2">
            {upcoming.map((item) => (
              <div key={`${item.id}-${item.dueDate.toString()}`} className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Tag variant="outline">{formatUpcomingKind(item.kind)}</Tag>
                    <p className="text-xs text-slate-500">{new Date(item.dueDate).toLocaleDateString("ru-RU")}</p>
                  </div>
                  {item.url && (
                    <Link href={item.url} className="text-xs font-semibold text-brand-primary">
                      Открыть →
                    </Link>
                  )}
                </div>
                <p className="mt-1 font-semibold text-brand-text">{item.title}</p>
                {item.employeeName && <p className="text-xs text-slate-500">Сотрудник: {item.employeeName}</p>}
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-3" data-block="risks">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Сотрудники в риске</p>
              <h2 className="text-xl font-semibold text-brand-text">Открытые кейсы</h2>
            </div>
            <SecondaryButton href="/app/risk-center" className="px-3 py-1 text-xs">
              Risk Center
            </SecondaryButton>
          </div>
          {state.kind === "ready" && risks.length === 0 && <p className="text-sm text-slate-500">Нет кейсов в работе.</p>}
          <div className="space-y-2">
            {risks.map((risk) => (
              <RiskCard key={risk.caseId} risk={risk} />
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2" data-block="pilots">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Ключевые пилоты</p>
              <h2 className="text-xl font-semibold text-brand-text">В работе</h2>
            </div>
            <SecondaryButton href="/app/pilot" className="px-3 py-1 text-xs">
              Все пилоты
            </SecondaryButton>
          </div>
          {state.kind === "ready" && pilots.length === 0 && <p className="text-sm text-slate-500">Нет активных пилотов.</p>}
          <div className="space-y-2">
            {pilots.map((pilot) => (
              <PilotCard key={pilot.pilotId} pilot={pilot} />
            ))}
          </div>
        </Card>

        <Card className="space-y-3" data-block="notifications">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Недавние уведомления</p>
              <h2 className="text-xl font-semibold text-brand-text">Последние события</h2>
            </div>
            <SecondaryButton href="/app/notifications" className="px-3 py-1 text-xs">
              Все уведомления
            </SecondaryButton>
          </div>
          {state.kind === "ready" && notifications.length === 0 && <p className="text-sm text-slate-500">Уведомлений нет.</p>}
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Tag variant="outline">{n.type}</Tag>
                    <p className="text-[11px] text-slate-500">{n.createdAt && new Date(n.createdAt).toLocaleString("ru-RU")}</p>
                  </div>
                  {n.url && (
                    <Link href={n.url} className="text-xs font-semibold text-brand-primary">
                      Открыть →
                    </Link>
                  )}
                </div>
                <p className="mt-1 font-semibold text-brand-text">{n.title}</p>
                {n.isRead ? null : <p className="text-[11px] text-emerald-700">Непрочитано</p>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function normalizeSnapshot(snapshot: ManagerCommandCenterSnapshot): ManagerCommandCenterSnapshot {
  return {
    summary: snapshot.summary,
    upcoming: snapshot.upcoming.map((item) => ({
      ...item,
      dueDate: new Date(item.dueDate),
    })),
    risks: snapshot.risks.map((risk) => ({
      ...risk,
      detectedAt: new Date(risk.detectedAt),
    })),
    pilots: snapshot.pilots.map((pilot) => ({
      ...pilot,
      endDate: pilot.endDate ? new Date(pilot.endDate) : null,
    })),
    notifications: snapshot.notifications.map((n) => ({
      ...n,
      createdAt: new Date(n.createdAt),
    })),
  };
}

function mapType(type: ActionItem["type"]) {
  switch (type) {
    case "run_1_1":
      return "1:1";
    case "create_goal":
      return "Цели";
    case "close_program":
      return "Программы";
    case "fill_program_outcome":
      return "Итоги";
    case "answer_survey":
      return "Опросы";
    case "launch_program":
    case "launch_program_for_gap":
      return "Запуск";
    default:
      return "Действие";
  }
}

function renderStat(label: string, value: number | string, sub?: string) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-brand-text">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function RiskCard({ risk }: { risk: ManagerRiskHighlight }) {
  const tone = risk.level === "high" ? "bg-red-100 text-red-700" : risk.level === "medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
  return (
    <div className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-700">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{risk.level}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">{risk.status}</span>
        </div>
        <Link href={risk.url} className="text-xs font-semibold text-brand-primary">
          Открыть →
        </Link>
      </div>
      <p className="mt-1 font-semibold text-brand-text">{risk.employeeName}</p>
      <p className="text-xs text-slate-500">{risk.title}</p>
      <p className="text-[11px] text-slate-400">{risk.detectedAt.toLocaleDateString("ru-RU")}</p>
    </div>
  );
}

function PilotCard({ pilot }: { pilot: ManagerPilotHighlight }) {
  const statusLabel = pilot.status === "draft" ? "Запланирован" : pilot.status === "active" ? "Активен" : pilot.status === "completed" ? "Завершён" : pilot.status;
  return (
    <div className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-700">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Tag variant="outline">{statusLabel}</Tag>
          {pilot.isFromTemplate && <Tag variant="outline">Шаблон</Tag>}
        </div>
        <Link href={pilot.url} className="text-xs font-semibold text-brand-primary">
          Открыть →
        </Link>
      </div>
      <p className="mt-1 font-semibold text-brand-text">{pilot.title}</p>
      {pilot.employeeName && <p className="text-xs text-slate-500">Сотрудник: {pilot.employeeName}</p>}
      <p className="text-xs text-slate-500">
        Прогресс: {pilot.progressPercent ?? 0}%
        {pilot.endDate && ` · До ${new Date(pilot.endDate).toLocaleDateString("ru-RU")}`}
      </p>
    </div>
  );
}

function formatUpcomingKind(kind: ManagerUpcomingItem["kind"]) {
  if (kind === "pilot_step") return "Шаг пилота";
  if (kind === "one_on_one") return "Встреча";
  if (kind === "report_deadline") return "Дедлайн";
  return "Задача";
}

function isErrorPayload(value: unknown): value is { error?: { message?: string } } {
  return typeof value === "object" && value !== null && "error" in value;
}

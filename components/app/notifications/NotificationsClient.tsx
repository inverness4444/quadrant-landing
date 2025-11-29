"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import type { NotificationDTO } from "@/services/types/notification";

type NotificationsClientProps = {
  initialNotifications: NotificationDTO[];
  workspaceId: string;
  userId: string;
};

export default function NotificationsClient({ initialNotifications }: NotificationsClientProps) {
  const [notifications, setNotifications] = useState<NotificationDTO[]>(initialNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [settings, setSettings] = useState<{
    emailEnabled: boolean;
    emailDailyDigest: boolean;
    emailWeeklyDigest: boolean;
    inAppEnabled: boolean;
    timezone: string | null;
  } | null>(null);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === "unread" && n.isRead) return false;
      if (typeFilter !== "all" && n.type !== typeFilter) return false;
      return true;
    });
  }, [filter, typeFilter, notifications]);

  const load = async () => {
    const resp = await fetch("/api/app/notifications", { cache: "no-store" });
    const payload = await resp.json().catch(() => null);
    if (resp.ok && payload?.ok) {
      setNotifications(payload.notifications ?? payload.items ?? []);
    }
  };

  const loadSettings = async () => {
    const resp = await fetch("/api/app/notifications/settings", { cache: "no-store" });
    const json = await resp.json().catch(() => null);
    if (resp.ok && json?.ok) {
      setSettings(json.settings);
    }
  };

  useEffect(() => {
    void load();
    void loadSettings();
  }, []);

  const markAllRead = async () => {
    await fetch("/api/app/notifications/mark-all-read", { method: "POST" });
    await load();
  };

  const markRead = async (id: string, url?: string | null) => {
    await fetch(`/api/app/notifications/${id}/read`, { method: "POST" });
    await load();
    if (url) {
      window.location.assign(url);
    }
  };

  const updateSettings = async (patch: Partial<typeof settings>) => {
    if (!patch) return;
    await fetch("/api/app/notifications/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await loadSettings();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Уведомления</p>
          <h1 className="text-3xl font-semibold text-brand-text">Центр уведомлений</h1>
          <p className="text-sm text-slate-600">Важные действия и напоминания по пилотам, встречам и отчётам.</p>
        </div>
        <div className="flex gap-2">
          <SecondaryButton onClick={() => void load()} className="px-4 py-2">
            Обновить
          </SecondaryButton>
          <PrimaryButton onClick={() => void markAllRead()} className="px-4 py-2">
            Отметить все как прочитанные
          </PrimaryButton>
        </div>
    </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-sm font-semibold ${filter === "all" ? "bg-brand-primary/10 text-brand-text" : "text-slate-600"}`}
              onClick={() => setFilter("all")}
            >
              Все
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-sm font-semibold ${filter === "unread" ? "bg-brand-primary/10 text-brand-text" : "text-slate-600"}`}
              onClick={() => setFilter("unread")}
            >
              Непрочитанные
            </button>
          </div>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-xl border border-brand-border px-3 py-2 text-sm"
          >
            <option value="all">Все типы</option>
            <option value="pilot_step_due">Пилот: шаг</option>
            <option value="pilot_status">Пилот: статус</option>
            <option value="meeting_upcoming">Встречи</option>
            <option value="development_goal_due">Планы развития</option>
            <option value="development_goal_stale">Планы развития (без чек-инов)</option>
            <option value="report_stale">Отчёты</option>
            <option value="system">Система</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500">Нет уведомлений по выбранным фильтрам.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => (
              <div
                key={n.id}
                className={`rounded-2xl border border-white/60 bg-white/90 p-3 text-sm ${n.isRead ? "text-slate-500" : "text-slate-700"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-brand-primary/10 px-2 py-1 text-[11px] font-semibold text-brand-primary">
                      {formatType(n.type)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                        (n.priority ?? 2) === 1 ? "bg-red-100 text-red-700" : (n.priority ?? 2) === 3 ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      Приоритет {(n.priority ?? 2) === 1 ? "Высокий" : (n.priority ?? 2) === 3 ? "Низкий" : "Средний"}
                    </span>
                    {!n.isRead && <span className="text-[11px] font-semibold text-amber-600">Новое</span>}
                  </div>
                  <span className="text-[11px] text-slate-400">{new Date(n.createdAt).toLocaleString("ru-RU")}</span>
                </div>
                <p className="mt-1 font-semibold text-brand-text">{n.title}</p>
                <p className="text-xs text-slate-600">{n.body}</p>
                <div className="mt-2 flex gap-2 text-xs">
                  <PrimaryButton onClick={() => void markRead(n.id, n.url ?? undefined)} className="px-3 py-1 text-xs">
                    {n.url ? "Перейти" : "Отметить прочитанным"}
                  </PrimaryButton>
                  {!n.isRead && (
                    <SecondaryButton onClick={() => void markRead(n.id)} className="px-3 py-1 text-xs">
                      Прочитано
                    </SecondaryButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <h3 className="text-lg font-semibold text-brand-text">Настройки уведомлений</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={settings?.inAppEnabled ?? true}
              onChange={(e) => void updateSettings({ inAppEnabled: e.target.checked })}
            />
            In-app уведомления
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={settings?.emailDailyDigest ?? false}
              onChange={(e) => void updateSettings({ emailDailyDigest: e.target.checked })}
            />
            Ежедневный e-mail дайджест
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={settings?.emailWeeklyDigest ?? false}
              onChange={(e) => void updateSettings({ emailWeeklyDigest: e.target.checked })}
            />
            Еженедельный e-mail дайджест
          </label>
        </div>
        <label className="space-y-1 text-sm text-slate-600">
          Часовой пояс (TODO)
          <input
            value={settings?.timezone ?? ""}
            onChange={(e) => void updateSettings({ timezone: e.target.value })}
            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
            placeholder="Europe/Moscow"
          />
        </label>
      </Card>
    </div>
  );
}

function formatType(type: string) {
  const map: Record<string, string> = {
    pilot_step_due: "Пилот: срок шага",
    pilot_status: "Пилот",
    meeting_upcoming: "Встреча",
    development_goal_due: "План развития",
    development_goal_stale: "План развития",
    report_stale: "Отчёт",
    system: "Система",
  };
  return map[type] ?? type;
}

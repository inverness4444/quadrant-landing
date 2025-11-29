"use client";

import { useEffect, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { PilotRun } from "@/drizzle/schema";

type Props = {
  workspaceName: string;
  initialItems: PilotRun[];
  total: number;
};

type PilotStatusFilter = "active" | "draft" | "planned" | "completed" | "cancelled" | "all";

export default function PilotsPageClient({ workspaceName, initialItems, total }: Props) {
  const [items, setItems] = useState<PilotRun[]>(initialItems);
  const [status, setStatus] = useState<PilotStatusFilter>("active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(total);
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(false);

  useEffect(() => {
    if (status === "active" && initialItems.length) return;
    void load(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    const check = async () => {
      try {
        const resp = await fetch("/api/app/onboarding/state", { cache: "no-store" });
        const json = await resp.json().catch(() => null);
        if (resp.ok && json?.state?.isCompleted === false) setShowOnboardingBanner(true);
      } catch {
        // ignore
      }
    };
    void check();
  }, []);

  const load = async (nextStatus: PilotStatusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/app/pilots?status=${nextStatus}`, { cache: "no-store" });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || !json?.ok) throw new Error(json?.error?.message ?? "Не удалось загрузить пилоты");
      setItems(json.items ?? []);
      setTotalCount(json.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  const filters: Array<{ key: PilotStatusFilter; label: string }> = [
    { key: "active", label: "Активные" },
    { key: "draft", label: "Черновики" },
    { key: "planned", label: "Запланированные" },
    { key: "completed", label: "Завершённые" },
    { key: "all", label: "Все" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Pilot programs</p>
          <h1 className="text-3xl font-semibold text-brand-text">Пилоты</h1>
          <p className="text-sm text-slate-600">Эксперименты по развитию людей и команд в workspace «{workspaceName}».</p>
        </div>
        <div className="flex gap-2">
          <SecondaryButton href="/app/pilots/templates">Шаблоны</SecondaryButton>
          <PrimaryButton href="/app/pilots/new">Создать пилот</PrimaryButton>
        </div>
      </div>

      <Card className="space-y-4">
        {showOnboardingBanner && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Мастер настройки не завершён. Рекомендуем пройти <a href="/app/setup" className="font-semibold underline">/app/setup</a>.
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatus(f.key)}
                className={`rounded-full px-3 py-1 text-sm ${status === f.key ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-700"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">Всего: {totalCount}</p>
        </div>
        {loading && <p className="text-sm text-slate-500">Загрузка…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && items.length === 0 && <p className="text-sm text-slate-500">Пилотов в этом статусе нет.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((pilot) => (
            <Card key={pilot.id} className="border border-white/60 bg-white/90 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-brand-text">{pilot.name}</h3>
                  <p className="text-sm text-slate-600">{pilot.description ?? "Описание не указано"}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <Tag variant="outline">Статус: {formatStatus(pilot.status)}</Tag>
                    {pilot.startDate && <Tag variant="outline">Старт: {formatDate(pilot.startDate)}</Tag>}
                    {pilot.endDate && <Tag variant="outline">Финиш: {formatDate(pilot.endDate)}</Tag>}
                  </div>
                  {pilot.targetAudience && <p className="mt-2 text-xs text-slate-500">Целевая аудитория: {pilot.targetAudience}</p>}
                </div>
                <PrimaryButton href={`/app/pilots/${pilot.id}`} className="px-3 py-1 text-xs">
                  Открыть
                </PrimaryButton>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}

function formatStatus(status: PilotRun["status"]) {
  const map: Record<PilotRun["status"], string> = {
    draft: "Черновик",
    planned: "Запланирован",
    active: "Активен",
    completed: "Завершён",
    cancelled: "Отменён",
    archived: "Архив",
  };
  return map[status] ?? status;
}

function formatDate(date: string | null) {
  if (!date) return "–";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("ru-RU");
}

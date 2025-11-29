"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { AgendaItem } from "@/services/agendaService";

type RangeOption = "week" | "two_weeks" | "month";

export default function AgendaClient() {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeOption>("week");
  const [hideIds, setHideIds] = useState<Set<string>>(new Set());
  const [priorityFirst, setPriorityFirst] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = rangeToDates(range);
      const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
      const resp = await fetch(`/api/app/agenda?${params.toString()}`, { cache: "no-store" });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || !json?.ok) throw new Error(json?.error?.message ?? "Не удалось загрузить повестку");
      setItems(json.items ?? []);
      setHideIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => items.filter((i) => !hideIds.has(i.id)), [items, hideIds]);

  const grouped = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      if (priorityFirst) {
        const pa = a.priority;
        const pb = b.priority;
        if (pa !== pb) return pa - pb;
      }
      return a.date.localeCompare(b.date);
    });
    const byDate: Record<string, AgendaItem[]> = {};
    sorted.forEach((item) => {
      const key = item.date.slice(0, 10);
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(item);
    });
    return byDate;
  }, [filtered, priorityFirst]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Agenda</p>
          <h1 className="text-3xl font-semibold text-brand-text">Повестка менеджера</h1>
          <p className="text-sm text-slate-600">Встречи, ревью пилотов и планы развития, на которые стоит обратить внимание.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={() => void load()} disabled={loading}>
            Обновить
          </SecondaryButton>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={priorityFirst} onChange={(e) => setPriorityFirst(e.target.checked)} />
            Сначала важные
          </label>
        </div>
      </div>

      <Card className="flex flex-wrap gap-2">
        <RangeButton current={range} value="week" onSelect={setRange} label="Эта неделя" />
        <RangeButton current={range} value="two_weeks" onSelect={setRange} label="2 недели" />
        <RangeButton current={range} value="month" onSelect={setRange} label="Месяц" />
      </Card>

      {error && <Card className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>}
      {loading && <p className="text-sm text-slate-500">Загрузка…</p>}
      {!loading && Object.keys(grouped).length === 0 && <p className="text-sm text-slate-500">На ближайшее время задач нет.</p>}

      <div className="space-y-4">
        {Object.entries(grouped).map(([date, dayItems]) => (
          <Card key={date} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{formatDate(date)}</p>
                <h3 className="text-lg font-semibold text-brand-text">{new Date(date).toLocaleDateString("ru-RU", { weekday: "long" })}</h3>
              </div>
              <Tag variant="outline">{dayItems.length}</Tag>
            </div>
            <div className="space-y-2">
              {dayItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag variant="outline">{labelByKind(item.kind)}</Tag>
                      <Tag variant="outline" className={item.priority === 1 ? "border-red-300 text-red-700" : ""}>
                        Приоритет {item.priority}
                      </Tag>
                    </div>
                    <div className="flex gap-2">
                      {item.relatedPilotId && (
                        <PrimaryButton href={`/app/pilots/${item.relatedPilotId}`} className="px-3 py-1 text-xs">
                          Перейти
                        </PrimaryButton>
                      )}
                      {item.relatedEmployeeId && (
                        <SecondaryButton href={`/app/employee/${item.relatedEmployeeId}`} className="px-3 py-1 text-xs">
                          Профиль
                        </SecondaryButton>
                      )}
                      {item.relatedReportId && (
                        <SecondaryButton href={`/app/reports/quarterly/${item.relatedReportId}`} className="px-3 py-1 text-xs">
                          Отчёт
                        </SecondaryButton>
                      )}
                      <button
                        type="button"
                        className="text-xs text-slate-500 hover:text-slate-700"
                        onClick={() => setHideIds((prev) => new Set(prev).add(item.id))}
                      >
                        Скрыть на сегодня
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 font-semibold text-brand-text">{item.title}</p>
                  {item.description && <p className="text-xs text-slate-500">{item.description}</p>}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RangeButton({ current, value, onSelect, label }: { current: RangeOption; value: RangeOption; onSelect: (v: RangeOption) => void; label: string }) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`rounded-full px-3 py-1 text-sm ${active ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-700"}`}
    >
      {label}
    </button>
  );
}

function labelByKind(kind: AgendaItem["kind"]) {
  const map: Record<AgendaItem["kind"], string> = {
    one_on_one: "1:1",
    development_goal_review: "План развития",
    pilot_review: "Пилот",
    feedback: "Опрос",
    skill_gap_review: "Skill gap",
    quarterly_report_review: "Квартальный отчёт",
    other: "Другое",
  };
  return map[kind] ?? kind;
}

function formatDate(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function rangeToDates(range: RangeOption) {
  const now = new Date();
  if (range === "week") return { from: now, to: addDays(now, 7) };
  if (range === "two_weeks") return { from: now, to: addDays(now, 14) };
  return { from: now, to: addDays(now, 30) };
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { OneOnOne } from "@/drizzle/schema";

type Range = "week" | "two_weeks" | "month";

export default function OneOnOnesClient() {
  const [items, setItems] = useState<OneOnOne[]>([]);
  const [range, setRange] = useState<Range>("week");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ employeeId: "", scheduledAt: "", durationMinutes: 60 });

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
      const resp = await fetch(`/api/app/one-on-ones?${params.toString()}`, { cache: "no-store" });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || !json?.ok) throw new Error(json?.error?.message ?? "Не удалось загрузить 1:1");
      setItems(json.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const create = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/app/one-on-ones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || !json?.ok) throw new Error(json?.error?.message ?? "Не удалось создать 1:1");
      setFormOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo(() => {
    const sorted = [...items].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    const map: Record<string, OneOnOne[]> = {};
    sorted.forEach((it) => {
      const key = it.scheduledAt.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(it);
    });
    return map;
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">1:1</p>
          <h1 className="text-3xl font-semibold text-brand-text">1:1 встречи</h1>
          <p className="text-sm text-slate-600">Назначайте и отслеживайте встречи с сотрудниками.</p>
        </div>
        <div className="flex gap-2">
          <SecondaryButton onClick={() => void load()} disabled={loading}>Обновить</SecondaryButton>
          <PrimaryButton onClick={() => setFormOpen(true)}>Назначить 1:1</PrimaryButton>
        </div>
      </div>

      <Card className="flex flex-wrap gap-2">
        <RangeButton value="week" current={range} onSelect={setRange} label="Неделя" />
        <RangeButton value="two_weeks" current={range} onSelect={setRange} label="2 недели" />
        <RangeButton value="month" current={range} onSelect={setRange} label="Месяц" />
      </Card>

      {error && <Card className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>}
      {loading && <p className="text-sm text-slate-500">Загрузка…</p>}
      {!loading && items.length === 0 && <p className="text-sm text-slate-500">Встречи не запланированы.</p>}

      <div className="space-y-3">
        {Object.entries(grouped).map(([date, list]) => (
          <Card key={date} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{formatDate(date)}</p>
                <h3 className="text-lg font-semibold text-brand-text">{new Date(date).toLocaleDateString("ru-RU", { weekday: "long" })}</h3>
              </div>
              <Tag variant="outline">{list.length}</Tag>
            </div>
            <div className="space-y-2">
              {list.map((it) => (
                <div key={it.id} className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500">{new Date(it.scheduledAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="font-semibold text-brand-text">Встреча с сотрудником</span>
                      <span className="text-xs text-slate-500">Статус: {it.status}</span>
                    </div>
                    <div className="flex gap-2">
                      <PrimaryButton href={`/app/one-on-ones/${it.id}`} className="px-3 py-1 text-xs">Открыть</PrimaryButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {formOpen && (
        <Card className="space-y-3">
          <h3 className="text-lg font-semibold text-brand-text">Назначить 1:1</h3>
          <label className="block space-y-1 text-sm text-slate-700">
            ID сотрудника
            <input value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="w-full rounded-xl border border-brand-border px-3 py-2" />
          </label>
          <label className="block space-y-1 text-sm text-slate-700">
            Дата и время
            <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="w-full rounded-xl border border-brand-border px-3 py-2" />
          </label>
          <label className="block space-y-1 text-sm text-slate-700">
            Длительность, мин
            <input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} className="w-full rounded-xl border border-brand-border px-3 py-2" />
          </label>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setFormOpen(false)}>Отмена</SecondaryButton>
            <PrimaryButton onClick={() => void create()} disabled={!form.employeeId || !form.scheduledAt}>Создать</PrimaryButton>
          </div>
        </Card>
      )}
    </div>
  );
}

function RangeButton({ value, current, onSelect, label }: { value: Range; current: Range; onSelect: (v: Range) => void; label: string }) {
  const active = value === current;
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

function rangeToDates(range: Range) {
  const now = new Date();
  if (range === "week") return { from: now, to: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) };
  if (range === "two_weeks") return { from: now, to: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) };
  return { from: now, to: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) };
}

function formatDate(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

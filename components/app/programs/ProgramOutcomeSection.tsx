"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";

type Metric = { key: string; label: string; value: number | string; unit?: string; direction?: "up" | "down" | "neutral" };
type OutcomeResponse = {
  ok: boolean;
  outcome: {
    id?: string;
    summaryTitle: string;
    summaryText: string;
    metrics: string;
    sentiment: "positive" | "neutral" | "negative";
    recommendations: string;
  } | null;
};

export default function ProgramOutcomeSection({ programId, canEdit }: { programId: string; canEdit: boolean }) {
  const [outcome, setOutcome] = useState<OutcomeResponse["outcome"]>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    summaryTitle: "",
    summaryText: "",
    sentiment: "neutral" as "positive" | "neutral" | "negative",
    recommendations: "",
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/app/outcomes/programs/${programId}`, { cache: "no-store" });
      const json = (await resp.json()) as OutcomeResponse;
      if (!resp.ok || !json?.ok) throw new Error(json?.error?.message ?? "Ошибка");
      setOutcome(json.outcome);
      if (json.outcome) {
        setDraft({
          summaryTitle: json.outcome.summaryTitle,
          summaryText: json.outcome.summaryText,
          sentiment: json.outcome.sentiment,
          recommendations: json.outcome.recommendations,
        });
      }
      if (json.outcome?.metrics) {
        try {
          setMetrics(JSON.parse(json.outcome.metrics));
        } catch {
          setMetrics([]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить итоги");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/app/outcomes/programs/${programId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, metrics }),
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || !json?.ok) throw new Error(json?.error?.message ?? "Не удалось сохранить итоги");
      setEditing(false);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setLoading(false);
    }
  };

  const suggest = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/app/outcomes/programs/${programId}/suggest`, { cache: "no-store" });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || !json?.ok) throw new Error(json?.error?.message ?? "Не удалось подтянуть метрики");
      setMetrics(json.metrics ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при предложении метрик");
    } finally {
      setLoading(false);
    }
  };

  const sentimentOptions = useMemo(
    () => [
      { value: "positive", label: "Позитивный" },
      { value: "neutral", label: "Нейтральный" },
      { value: "negative", label: "Негативный" },
    ],
    [],
  );

  if (loading && !outcome) return <Card className="p-3 text-sm text-slate-500">Загрузка итогов…</Card>;
  if (error) return <Card className="p-3 text-sm text-red-600">{error}</Card>;

  if (!outcome) {
    return (
      <Card className="space-y-3">
        <p className="text-sm text-slate-600">Итоги программы ещё не оформлены.</p>
        {canEdit && (
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setEditing(true)} className="px-3 py-2 text-sm">
              Оформить итоги
            </SecondaryButton>
            <SecondaryButton onClick={() => void suggest()} className="px-3 py-2 text-sm">
              Подтянуть метрики
            </SecondaryButton>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Итоги программы</p>
          <h3 className="text-xl font-semibold text-brand-text">{outcome.summaryTitle}</h3>
        </div>
        {canEdit && !editing && (
          <div className="flex gap-2">
            <SecondaryButton onClick={() => void suggest()} className="px-3 py-2 text-sm">
              Подтянуть метрики
            </SecondaryButton>
            <SecondaryButton onClick={() => setEditing(true)} className="px-3 py-2 text-sm">
              Редактировать
            </SecondaryButton>
          </div>
        )}
      </div>
      {editing ? (
        <div className="space-y-3">
          <label className="block text-sm text-slate-600">
            Заголовок
            <input
              className="mt-1 w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
              value={draft.summaryTitle}
              onChange={(e) => setDraft((d) => ({ ...d, summaryTitle: e.target.value }))}
            />
          </label>
          <label className="block text-sm text-slate-600">
            Итоги
            <textarea
              className="mt-1 w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
              rows={4}
              value={draft.summaryText}
              onChange={(e) => setDraft((d) => ({ ...d, summaryText: e.target.value }))}
            />
          </label>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-brand-text">Метрики</p>
            {metrics.map((m, idx) => (
              <div key={m.key} className="grid gap-2 md:grid-cols-4">
                <input
                  className="rounded-xl border border-brand-border px-3 py-2 text-sm"
                  value={m.label}
                  onChange={(e) => setMetrics((list) => list.map((item, i) => (i === idx ? { ...item, label: e.target.value } : item)))}
                  placeholder="Label"
                />
                <input
                  className="rounded-xl border border-brand-border px-3 py-2 text-sm"
                  value={m.value}
                  onChange={(e) => setMetrics((list) => list.map((item, i) => (i === idx ? { ...item, value: e.target.value } : item)))}
                  placeholder="Value"
                />
                <input
                  className="rounded-xl border border-brand-border px-3 py-2 text-sm"
                  value={m.unit ?? ""}
                  onChange={(e) => setMetrics((list) => list.map((item, i) => (i === idx ? { ...item, unit: e.target.value } : item)))}
                  placeholder="Unit"
                />
                <select
                  className="rounded-xl border border-brand-border px-3 py-2 text-sm"
                  value={m.direction ?? "neutral"}
                  onChange={(e) =>
                    setMetrics((list) => list.map((item, i) => (i === idx ? { ...item, direction: e.target.value as Metric["direction"] } : item)))
                  }
                >
                  <option value="neutral">Без тренда</option>
                  <option value="up">Рост</option>
                  <option value="down">Падение</option>
                </select>
              </div>
            ))}
            <SecondaryButton
              onClick={() => setMetrics((list) => [...list, { key: `metric_${list.length + 1}`, label: "", value: "" }])}
              className="px-3 py-2 text-sm"
            >
              Добавить метрику
            </SecondaryButton>
          </div>
          <label className="block text-sm text-slate-600">
            Sentiment
            <select
              className="mt-1 w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
              value={draft.sentiment}
              onChange={(e) => setDraft((d) => ({ ...d, sentiment: e.target.value as typeof draft.sentiment }))}
            >
              {sentimentOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-600">
            Рекомендации
            <textarea
              className="mt-1 w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
              rows={3}
              value={draft.recommendations}
              onChange={(e) => setDraft((d) => ({ ...d, recommendations: e.target.value }))}
            />
          </label>
          <div className="flex gap-2">
            <PrimaryButton onClick={() => void save()} disabled={loading} className="px-4 py-2">
              Сохранить итоги
            </PrimaryButton>
            <SecondaryButton onClick={() => setEditing(false)} className="px-4 py-2">
              Отмена
            </SecondaryButton>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-700 whitespace-pre-line">{outcome.summaryText}</p>
          {metrics.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {metrics.map((m) => (
                <Card key={m.key} className="border border-white/60 bg-white/90 p-3 text-sm text-slate-700">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{m.label}</p>
                  <p className="text-lg font-semibold text-brand-text">
                    {m.value} {m.unit ?? ""}
                  </p>
                </Card>
              ))}
            </div>
          )}
          <div className="rounded-2xl border border-white/60 bg-white/80 p-3 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Рекомендации</p>
            <p className="mt-1 whitespace-pre-line">{outcome.recommendations || "Нет рекомендаций"}</p>
          </div>
        </>
      )}
    </Card>
  );
}

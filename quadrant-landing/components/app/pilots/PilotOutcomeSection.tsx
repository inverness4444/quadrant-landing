"use client";

import { useEffect, useState } from "react";
import Card from "@/components/common/Card";
import SecondaryButton from "@/components/common/SecondaryButton";

type Metric = { key: string; label: string; value: number | string; unit?: string; direction?: "up" | "down" | "neutral" };

type OutcomeResponse = {
  ok: boolean;
  outcome: {
    summaryTitle: string;
    summaryText: string;
    metrics: string;
    sentiment: "positive" | "neutral" | "negative";
    recommendations: string;
  } | null;
};

export default function PilotOutcomeSection({ pilotId, canEdit }: { pilotId: string; canEdit: boolean }) {
  const [outcome, setOutcome] = useState<OutcomeResponse["outcome"]>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/app/outcomes/pilots/${pilotId}`, { cache: "no-store" });
      const json = (await resp.json()) as OutcomeResponse;
      if (!resp.ok || !json?.ok) throw new Error((json as any)?.error?.message ?? "Ошибка");
      setOutcome(json.outcome);
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
  }, []);

  if (loading && !outcome) return <Card className="p-3 text-sm text-slate-500">Загрузка итогов…</Card>;
  if (error) return <Card className="p-3 text-sm text-red-600">{error}</Card>;

  if (!outcome) {
    return (
      <Card className="space-y-3">
        <p className="text-sm text-slate-600">Итоги пилота ещё не оформлены.</p>
        {canEdit && (
          <SecondaryButton onClick={() => void load()} className="px-3 py-2 text-sm">
            Обновить
          </SecondaryButton>
        )}
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Итоги пилота</p>
          <h3 className="text-xl font-semibold text-brand-text">{outcome.summaryTitle}</h3>
        </div>
        {canEdit && (
          <SecondaryButton href={`/app/pilots/${pilotId}?tab=outcome`} className="px-3 py-2 text-sm">
            Редактировать
          </SecondaryButton>
        )}
      </div>
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
    </Card>
  );
}

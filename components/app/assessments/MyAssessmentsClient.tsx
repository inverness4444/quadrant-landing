"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import type { SkillAssessmentDTO } from "@/services/types/assessment";

type EmployeeCycle = {
  cycleId: string;
  name: string;
  status: string;
  progress: number;
  assessments: SkillAssessmentDTO[];
};

export default function MyAssessmentsClient() {
  const [cycles, setCycles] = useState<EmployeeCycle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/app/assessments/cycles", { cache: "no-store" });
      const payload = await response.json();
      if (response.ok && payload?.ok) {
        const cyclesList: Array<{ id: string; status: string; name: string }> = payload.cycles ?? [];
        const active = cyclesList.filter((cycle) => cycle.status === "active");
        const enriched: EmployeeCycle[] = [];
        for (const cycle of active) {
          const detail = await fetch(`/api/app/assessments/cycles/${cycle.id}/me`, { cache: "no-store" });
          const detailPayload = await detail.json();
          if (detail.ok && detailPayload?.ok) {
            enriched.push({
              cycleId: cycle.id,
              name: cycle.name,
              status: cycle.status,
              progress: detailPayload.progress,
              assessments: detailPayload.assessments ?? [],
            });
          }
        }
        setCycles(enriched);
      } else {
        throw new Error(payload?.error?.message ?? "Не удалось загрузить циклы");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (cycle: EmployeeCycle) => {
    setLoading(true);
    setError(null);
    try {
      for (const assessment of cycle.assessments) {
        await fetch(`/api/app/assessments/cycles/${cycle.cycleId}/me/skills`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            skillId: assessment.skillId,
            selfLevel: assessment.selfLevel ?? 3,
            selfComment: assessment.selfComment ?? "",
            submit: true,
          }),
        });
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить самооценку");
    } finally {
      setLoading(false);
    }
  };

  useMemo(() => cycles.reduce((sum, cycle) => sum + cycle.assessments.length, 0), [cycles]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Самооценка</p>
          <h1 className="text-3xl font-semibold text-brand-text">Мои оценки</h1>
          <p className="text-sm text-slate-600">Пройдите самооценку по навыкам и отправьте менеджеру.</p>
        </div>
        <SecondaryButton onClick={() => void load()} disabled={loading} className="px-4 py-2">
          Обновить
        </SecondaryButton>
      </div>

      {error && <Card className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>}
      {loading && cycles.length === 0 && <p className="text-sm text-slate-500">Загружаем…</p>}
      {cycles.length === 0 ? (
        <Card className="text-sm text-slate-500">Активных циклов для вас пока нет.</Card>
      ) : (
        cycles.map((cycle) => (
          <Card key={cycle.cycleId} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-brand-text">{cycle.name}</p>
                <p className="text-xs text-slate-500">Прогресс: {cycle.progress}%</p>
              </div>
              <PrimaryButton onClick={() => void handleSubmit(cycle)} className="px-4 py-2">
                Отправить самооценку
              </PrimaryButton>
            </div>
            <div className="space-y-2">
              {cycle.assessments.map((assessment) => (
                <div key={assessment.id} className="rounded-2xl border border-brand-border/60 bg-white/90 p-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-text">{assessment.skillId}</p>
                      <p className="text-xs text-slate-500">Статус: {assessment.status}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span>Самооценка</span>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        defaultValue={assessment.selfLevel ?? 3}
                        onBlur={(event) =>
                          void fetch(`/api/app/assessments/cycles/${cycle.cycleId}/me/skills`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              skillId: assessment.skillId,
                              selfLevel: Number(event.target.value),
                              submit: false,
                            }),
                          })
                        }
                        className="w-16 rounded-xl border border-brand-border px-2 py-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

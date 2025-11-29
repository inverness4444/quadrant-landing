"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import type { AssessmentCycleDTO } from "@/services/types/assessment";

type AssessmentsAdminClientProps = {
  workspaceName: string;
  initialCycles: AssessmentCycleDTO[];
};

export default function AssessmentsAdminClient({ workspaceName, initialCycles }: AssessmentsAdminClientProps) {
  const [cycles, setCycles] = useState(initialCycles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    startsAt: "",
    endsAt: "",
    teamIds: "",
  });

  useEffect(() => {
    void reload();
  }, []);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/app/assessments/cycles", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось загрузить циклы");
      }
      setCycles(payload.cycles ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  const createCycle = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/app/assessments/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null,
          teamIds: form.teamIds
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось создать цикл");
      }
      setForm({ name: "", description: "", startsAt: "", endsAt: "", teamIds: "" });
      setFormOpen(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (cycleId: string, status: AssessmentCycleDTO["status"]) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/app/assessments/cycles/${cycleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось обновить статус");
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Оценки навыков</p>
          <h1 className="text-3xl font-semibold text-brand-text">Калибровка навыков</h1>
          <p className="text-sm text-slate-600">
            Волны оценок, самооценки сотрудников и калибровка менеджеров в workspace «{workspaceName}».
          </p>
        </div>
        <PrimaryButton onClick={() => setFormOpen(true)} className="px-4 py-2">
          Создать цикл
        </PrimaryButton>
      </div>

      {error && <Card className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>}

      {formOpen && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-brand-text">Новый цикл</h3>
            <SecondaryButton onClick={() => setFormOpen(false)} className="px-3 py-1 text-xs">
              Закрыть
            </SecondaryButton>
          </div>
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
            placeholder="Название (например, Калибровка Q1 2026)"
          />
          <textarea
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
            placeholder="Описание"
            rows={3}
          />
          <div className="grid gap-2 md:grid-cols-2">
            <input
              value={form.startsAt}
              onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))}
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
              placeholder="Дата начала (ISO)"
            />
            <input
              value={form.endsAt}
              onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))}
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
              placeholder="Дата окончания (ISO)"
            />
          </div>
          <input
            value={form.teamIds}
            onChange={(event) => setForm((prev) => ({ ...prev, teamIds: event.target.value }))}
            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
            placeholder="Команды (ID через запятую)"
          />
          <div className="flex gap-2">
            <PrimaryButton onClick={() => void createCycle()} disabled={loading} className="px-4 py-2">
              {loading ? "Сохраняем…" : "Сохранить"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setFormOpen(false)} className="px-4 py-2">
              Отмена
            </SecondaryButton>
          </div>
        </Card>
      )}

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-brand-text">Циклы</h2>
          <SecondaryButton onClick={() => void reload()} className="px-3 py-1 text-xs">
            Обновить
          </SecondaryButton>
        </div>
        {loading && <p className="text-sm text-slate-500">Загружаем…</p>}
        {cycles.length === 0 ? (
          <p className="text-sm text-slate-500">Циклы ещё не созданы.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Цикл</th>
                  <th className="px-3 py-2">Статус</th>
                  <th className="px-3 py-2">Период</th>
                  <th className="px-3 py-2">Команды</th>
                  <th className="px-3 py-2 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/70">
                {cycles.map((cycle) => (
                  <tr key={cycle.id}>
                    <td className="px-3 py-3">
                      <Link href={`/app/assessments/${cycle.id}`} className="font-semibold text-brand-primary">
                        {cycle.name}
                      </Link>
                      <p className="text-xs text-slate-500">{cycle.description}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{formatStatus(cycle.status)}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {cycle.startsAt ? cycle.startsAt : "—"} – {cycle.endsAt ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{cycle.teamIds.length}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {cycle.status === "draft" && (
                          <PrimaryButton onClick={() => void updateStatus(cycle.id, "active")} className="px-3 py-1 text-xs">
                            Запустить
                          </PrimaryButton>
                        )}
                        {cycle.status === "active" && (
                          <SecondaryButton onClick={() => void updateStatus(cycle.id, "closed")} className="px-3 py-1 text-xs">
                            Закрыть
                          </SecondaryButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function formatStatus(status: string) {
  const map: Record<string, string> = {
    draft: "Черновик",
    active: "Активен",
    closed: "Закрыт",
    archived: "Архив",
  };
  return map[status] ?? status;
}

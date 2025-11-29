"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { PilotRunDTO } from "@/services/types/pilot";

type PilotRunsDashboardClientProps = {
  workspaceName: string;
  initialRuns: PilotRunDTO[];
  teams: Array<{ id: string; name: string }>;
};

export default function PilotRunsDashboardClient({ workspaceName, initialRuns, teams }: PilotRunsDashboardClientProps) {
  const router = useRouter();
  const [runs, setRuns] = useState<PilotRunDTO[]>(initialRuns);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; description: string; teamIds: string[] }>({
    name: "",
    description: "",
    teamIds: [],
  });

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/app/pilot/runs", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось обновить список пилотов");
      }
      setRuns(payload.runs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  const createRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/app/pilot/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          teamIds: form.teamIds,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось создать пилот");
      }
      setForm({ name: "", description: "", teamIds: [] });
      setFormOpen(false);
      await refresh();
      router.push(`/app/pilot/${payload.run.id}`);
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
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Пилот Quadrant</p>
          <h1 className="text-3xl font-semibold text-brand-text">Пилоты и плейбук</h1>
          <p className="text-sm text-slate-600">
            Чек-лист внедрения Quadrant для workspace «{workspaceName}»: шаги, команды, заметки.
          </p>
        </div>
        <PrimaryButton onClick={() => setFormOpen(true)} className="px-4 py-2">
          Создать пилот
        </PrimaryButton>
        <SecondaryButton href="/app/pilots/templates" className="px-4 py-2">
          Шаблоны пилотов
        </SecondaryButton>
      </div>

      {error && <Card className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>}

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Пилоты</p>
            <h2 className="text-xl font-semibold text-brand-text">Запуски и прогресс</h2>
          </div>
          <SecondaryButton onClick={() => void refresh()} className="px-3 py-1 text-xs" disabled={loading}>
            Обновить
          </SecondaryButton>
        </div>
        {runs.length === 0 ? (
          <p className="text-sm text-slate-500">Пилоты ещё не созданы. Создайте первый и выберите 1–2 команды.</p>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => (
              <div key={run.id} className="rounded-2xl border border-white/60 bg-white/90 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-brand-text">{run.name}</p>
                    <p className="text-xs text-slate-500">{run.description ?? "Описание не указано"}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <Tag variant="outline">Статус: {formatStatus(run.status)}</Tag>
                      <Tag variant="outline">Команд: {run.teams.length}</Tag>
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-600">
                    <p>Прогресс: {run.summaryProgress.percent}%</p>
                    <p>
                      Шаги: {run.summaryProgress.completedSteps}/{run.summaryProgress.totalSteps}
                    </p>
                    <PrimaryButton href={`/app/pilot/${run.id}`} className="mt-2 px-3 py-1 text-xs">
                      Открыть
                    </PrimaryButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {formOpen && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-brand-text">Новый пилот</h3>
            <SecondaryButton onClick={() => setFormOpen(false)} className="px-3 py-1 text-xs">
              Закрыть
            </SecondaryButton>
          </div>
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
            placeholder="Название пилота (например, Пилот Backend)"
          />
          <textarea
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
            placeholder="Описание целей пилота"
            rows={3}
          />
          <div>
            <p className="text-sm font-semibold text-brand-text">Команды</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {teams.map((team) => {
                const checked = form.teamIds.includes(team.id);
                return (
                  <label key={team.id} className="flex items-center gap-2 rounded-xl border border-brand-border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        setForm((prev) => ({
                          ...prev,
                          teamIds: event.target.checked
                            ? [...prev.teamIds, team.id]
                            : prev.teamIds.filter((id) => id !== team.id),
                        }));
                      }}
                    />
                    {team.name}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <PrimaryButton onClick={() => void createRun()} disabled={loading || !form.name} className="px-4 py-2">
              Создать пилот
            </PrimaryButton>
            <SecondaryButton onClick={() => setFormOpen(false)} className="px-4 py-2">
              Отмена
            </SecondaryButton>
          </div>
        </Card>
      )}
    </div>
  );
}

function formatStatus(status: string) {
  const map: Record<string, string> = {
    draft: "Черновик",
    active: "Активен",
    completed: "Завершён",
    archived: "Архив",
  };
  return map[status] ?? status;
}

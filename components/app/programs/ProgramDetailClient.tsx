"use client";

import { useEffect, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import Tag from "@/components/common/Tag";
import type { WorkspaceProgram } from "@/drizzle/schema";
import ProgramOutcomeSection from "@/components/app/programs/ProgramOutcomeSection";

export default function ProgramDetailClient({ program }: { program: WorkspaceProgram }) {
  const [current, setCurrent] = useState(program);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrent(program);
  }, [program]);

  const changeStatus = async (status: WorkspaceProgram["status"]) => {
    setError(null);
    setMessage(null);
    try {
      const resp = await fetch(`/api/app/programs/${current.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || !json?.ok) throw new Error(json?.error?.message ?? "Не удалось обновить статус программы");
      setCurrent(json.program ?? current);
      setMessage("Статус обновлён");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  const statusActions = () => {
    const actions: Array<{ label: string; status: WorkspaceProgram["status"] }> = [];
    if (current.status === "draft") actions.push({ label: "Запустить", status: "active" });
    if (current.status === "active") {
      actions.push({ label: "Поставить на паузу", status: "paused" });
      actions.push({ label: "Завершить", status: "completed" });
    }
    if (current.status === "paused") actions.push({ label: "Возобновить", status: "active" });
    return actions;
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Program</p>
            <h1 className="text-3xl font-semibold text-brand-text">{current.name}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              <Tag variant="outline">Статус: {statusLabel(current.status)}</Tag>
              {current.startedAt && <Tag variant="outline">Старт: {formatDate(current.startedAt)}</Tag>}
              {current.plannedEndAt && <Tag variant="outline">План: {formatDate(current.plannedEndAt)}</Tag>}
            </div>
            <p className="text-sm text-slate-700">{current.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusActions().map((action) => (
              <PrimaryButton key={action.status} onClick={() => void changeStatus(action.status)} className="px-3 py-1 text-xs">
                {action.label}
              </PrimaryButton>
            ))}
          </div>
        </div>
        {message && <p className="text-sm text-emerald-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>

      <ProgramOutcomeSection programId={current.id} canEdit />
    </div>
  );
}

function statusLabel(status: WorkspaceProgram["status"]) {
  const map: Record<WorkspaceProgram["status"], string> = {
    draft: "Черновик",
    active: "Активна",
    paused: "Пауза",
    completed: "Завершена",
  };
  return map[status] ?? status;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU");
}

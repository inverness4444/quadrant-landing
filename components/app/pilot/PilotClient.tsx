"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { Pilot, PilotStepStatus } from "@/drizzle/schema";
import type { PilotStepWithStatus } from "@/services/pilotService";

const statusMeta: Record<
  PilotStepStatus,
  { label: string; badge: string; selectClass: string }
> = {
  not_started: {
    label: "Не начато",
    badge: "bg-slate-100 text-slate-600",
    selectClass: "border-slate-200",
  },
  in_progress: {
    label: "В работе",
    badge: "bg-amber-100 text-amber-800",
    selectClass: "border-amber-200",
  },
  done: {
    label: "Готово",
    badge: "bg-emerald-100 text-emerald-800",
    selectClass: "border-emerald-200",
  },
};

type PilotClientProps = {
  initialPilot: Pilot | null;
  initialSteps: PilotStepWithStatus[];
};

type RiskSummary = {
  total: number;
  high: number;
};

const statusOptions: PilotStepStatus[] = ["not_started", "in_progress", "done"];

export default function PilotClient({ initialPilot, initialSteps }: PilotClientProps) {
  const [pilot, setPilot] = useState<Pilot | null>(initialPilot);
  const [steps, setSteps] = useState<PilotStepWithStatus[]>(() => sortSteps(initialSteps));
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingStep, setSavingStep] = useState<string | null>(null);
  const [riskSummary, setRiskSummary] = useState<RiskSummary | null>(null);
  const [riskError, setRiskError] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>(() => buildNotesMap(initialSteps));

  const refreshPilot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/app/pilot/steps", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; pilot: Pilot | null; steps: PilotStepWithStatus[]; error?: { message?: string } }
        | null;
      if (!response.ok || !payload) {
        throw new Error(payload?.error?.message ?? "Не удалось загрузить данные пилота");
      }
      setPilot(payload.pilot);
      setSteps(sortSteps(payload.steps));
      setNotesDraft(buildNotesMap(payload.steps));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshPilot();
  }, [refreshPilot]);

  useEffect(() => {
    async function fetchRisks() {
      try {
        const response = await fetch("/api/app/analytics/risks", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as
          | { ok?: boolean; risks?: Array<{ severity: string }>; error?: { message?: string } }
          | null;
        if (!response.ok || !payload) throw new Error(payload?.error?.message ?? "Не удалось загрузить риски");
        const risks = payload.risks ?? [];
        setRiskSummary({ total: risks.length, high: risks.filter((risk) => risk.severity === "high").length });
        setRiskError(null);
      } catch (err) {
        setRiskSummary(null);
        setRiskError(err instanceof Error ? err.message : "Ошибка загрузки рисков");
      }
    }
    void fetchRisks();
  }, []);

  const progress = useMemo(() => {
    const total = steps.length;
    const completed = steps.filter((step) => step.status === "done").length;
    return { completed, total };
  }, [steps]);

  const handleCreatePilot = async () => {
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/app/pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; pilot: Pilot | null; steps: PilotStepWithStatus[]; error?: { message?: string } }
        | null;
      if (!response.ok || !payload) {
        throw new Error(payload?.error?.message ?? "Не удалось создать пилот");
      }
      setPilot(payload.pilot);
      setSteps(sortSteps(payload.steps));
      setNotesDraft(buildNotesMap(payload.steps));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания пилота");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (stepId: string, status: PilotStepStatus) => {
    const current = steps.find((step) => step.id === stepId);
    if (!current) return;
    await saveStep(stepId, status, notesDraft[stepId] ?? current.notes ?? "");
  };

  const handleSaveNotes = async (stepId: string) => {
    const current = steps.find((step) => step.id === stepId);
    if (!current) return;
    await saveStep(stepId, current.status, notesDraft[stepId] ?? "");
  };

  const saveStep = async (stepId: string, status: PilotStepStatus, notes: string) => {
    setSavingStep(stepId);
    setError(null);
    try {
      const response = await fetch("/api/app/pilot/steps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId, status, notes }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; step?: PilotStepWithStatus; error?: { message?: string } }
        | null;
      if (!response.ok || !payload?.step) {
        throw new Error(payload?.error?.message ?? "Не удалось обновить шаг");
      }
      setSteps((prev) => {
        return sortSteps(prev.map((step) => (step.id === stepId ? { ...step, status: payload.step!.status, notes: payload.step!.notes } : step)));
      });
      setNotesDraft((prev) => ({ ...prev, [stepId]: payload.step.notes ?? notes }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка обновления шага");
    } finally {
      setSavingStep(null);
    }
  };

  if (!pilot) {
    return (
      <div className="space-y-6">
        <header>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Пилот Quadrant</p>
          <h1 className="text-3xl font-semibold text-brand-text">Пилот ещё не создан</h1>
          <p className="mt-2 text-base text-slate-600">
            Создайте пилотный сценарий, чтобы пройти 4–6-недельный процесс внедрения Quadrant.
          </p>
        </header>
        <Card className="space-y-4">
          <p className="text-sm text-slate-600">
            Мы создадим чеклист шагов, предложим цели и дадим доступ к аналитике, чтобы вместе с HR и тимлидом пройти пилот.
          </p>
          <PrimaryButton onClick={handleCreatePilot} disabled={creating} className="px-5 py-3">
            {creating ? "Создаём..." : "Создать пилот"}
          </PrimaryButton>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Пилот Quadrant</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold text-brand-text">{pilot.name}</h1>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(pilot.status)}`}>
            {pilotStatusLabel(pilot.status)}
          </span>
          {progress.total > 0 && (
            <Tag variant="outline">
              Прогресс: {progress.completed} / {progress.total}
            </Tag>
          )}
        </div>
        {pilot.goals && <p className="text-base text-slate-600">{pilot.goals}</p>}
        <div className="text-xs text-slate-500">
          {pilot.startDate ? formatDateRange(pilot.startDate, pilot.endDate) : "Сроки пилота уточняются"}
        </div>
        <div className="mt-3">
          <SecondaryButton href="/app/reports" className="px-4 py-2 text-sm">
            Сформировать отчёт по пилоту
          </SecondaryButton>
        </div>
      </header>

      {error && <Card className="border-red-200 bg-red-50 text-sm text-red-800">{error}</Card>}

      {steps.length === 0 ? (
        <Card className="text-sm text-slate-500">Шаги пилота пока не заданы.</Card>
      ) : (
        <div className="space-y-4">
          {steps.map((step) => (
            <Card key={step.id} className="space-y-4 border-brand-border/70">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-brand-text">{step.title}</p>
                    {step.mandatory && <Tag variant="outline">Обязательный</Tag>}
                  </div>
                  <p className="text-sm text-slate-500">{step.description}</p>
                </div>
                <div className="flex flex-col items-start gap-2 md:items-end">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusMeta[step.status].badge}`}>
                    {statusMeta[step.status].label}
                  </span>
                  <select
                    className={`h-10 rounded-2xl border px-3 text-sm ${statusMeta[step.status].selectClass}`}
                    value={step.status}
                    onChange={(event) => handleStatusChange(step.id, event.target.value as PilotStepStatus)}
                    disabled={savingStep === step.id || loading}
                  >
                    {statusOptions.map((value) => (
                      <option key={`${step.id}-${value}`} value={value}>
                        {statusMeta[value].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {renderStepIntegration(step.key, riskSummary, riskError)}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Заметки
                  <textarea
                    className="mt-1 w-full rounded-2xl border border-brand-border/70 px-4 py-2 text-sm"
                    value={notesDraft[step.id] ?? ""}
                    onChange={(event) => setNotesDraft((prev) => ({ ...prev, [step.id]: event.target.value }))}
                    rows={3}
                    placeholder="Опишите, что сделано по этому шагу"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <SecondaryButton
                    onClick={() => handleSaveNotes(step.id)}
                    disabled={savingStep === step.id}
                    className="px-4 py-2"
                  >
                    Сохранить заметку
                  </SecondaryButton>
                  {step.key === "staff_project" && (
                    <PrimaryButton href="/app/analytics/staffing" className="px-4 py-2">
                      Подбор команды
                    </PrimaryButton>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function buildNotesMap(steps: PilotStepWithStatus[]) {
  return steps.reduce<Record<string, string>>((acc, step) => {
    acc[step.id] = step.notes ?? "";
    return acc;
  }, {});
}

function sortSteps(steps: PilotStepWithStatus[]) {
  return [...steps].sort((a, b) => a.order - b.order);
}

function statusBadgeClass(status: Pilot["status"]) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-800";
    case "completed":
      return "bg-brand-primary/10 text-brand-primary";
    case "planned":
      return "bg-slate-100 text-slate-600";
    case "archived":
    default:
      return "bg-slate-200 text-slate-600";
  }
}

function pilotStatusLabel(status: Pilot["status"]) {
  switch (status) {
    case "active":
      return "Активный";
    case "completed":
      return "Завершён";
    case "planned":
      return "Запланирован";
    case "archived":
      return "Архив";
    default:
      return status;
  }
}

function formatDateRange(start: string, end?: string | null) {
  const startDate = new Date(start);
  const formatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });
  const startText = formatter.format(startDate);
  if (!end) {
    return `Старт ${startText}`;
  }
  const endText = formatter.format(new Date(end));
  return `${startText} — ${endText}`;
}

function renderStepIntegration(key: string, riskSummary: RiskSummary | null, riskError: string | null) {
  if (key === "map_team") {
    return (
      <div className="rounded-2xl border border-brand-border/60 bg-brand-muted/60 p-4 text-sm text-brand-text">
        <p className="font-semibold">Карта рисков</p>
        {riskError ? (
          <p className="text-red-600">{riskError}</p>
        ) : riskSummary ? (
          <p>
            Навыков в зоне риска: {riskSummary.total}. Критичных: {riskSummary.high}. <Link className="text-brand-primary" href="/app/analytics">Посмотреть детали →</Link>
          </p>
        ) : (
          <p>Загружаем данные...</p>
        )}
      </div>
    );
  }
  if (key === "check_risks") {
    return (
      <div className="rounded-2xl border border-brand-border/60 bg-white/70 p-3 text-sm text-slate-600">
        Проверьте аналитику по сотрудникам и навыкам. <Link className="text-brand-primary" href="/app/analytics">Открыть аналитику →</Link>
      </div>
    );
  }
  if (key === "staff_project") {
    return (
      <div className="rounded-2xl border border-brand-border/60 bg-white/70 p-3 text-sm text-slate-600">
        После настройки требований нажмите «Подбор команды», чтобы Quadrant собрал кандидатов из workspace.
      </div>
    );
  }
  return null;
}

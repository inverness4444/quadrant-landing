"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { AssessmentCycle } from "@/drizzle/schema";
import type { PilotRunDTO, PilotRunNoteDTO, PilotRunStepDTO } from "@/services/types/pilot";
import type { TalentDecisionDTO } from "@/services/types/talentDecision";

type PilotRunClientProps = {
  pilotRun: PilotRunDTO;
  cycles: AssessmentCycle[];
};

export default function PilotRunClient({ pilotRun, cycles }: PilotRunClientProps) {
  const router = useRouter();
  const [run, setRun] = useState<PilotRunDTO>(pilotRun);
  const [notes, setNotes] = useState<PilotRunNoteDTO[]>([]);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepUpdating, setStepUpdating] = useState<string | null>(null);
  const [metaUpdating, setMetaUpdating] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [noteForm, setNoteForm] = useState({
    type: "meeting",
    title: "",
    body: "",
    relatedTeamId: "",
    relatedScenarioId: "",
  });
  const [decisions, setDecisions] = useState<TalentDecisionDTO[]>([]);
  const [decisionsLoaded, setDecisionsLoaded] = useState(false);
  const [metaForm, setMetaForm] = useState({
    status: run.status,
    targetCycleId: run.targetCycleId ?? "",
  });
  const [scenarioLoading, setScenarioLoading] = useState<string | null>(null);

  const filteredNotes = useMemo(() => {
    if (filterType === "all") return notes;
    return notes.filter((note) => note.type === filterType);
  }, [filterType, notes]);

  const loadNotes = async () => {
    try {
      const response = await fetch(`/api/app/pilot/runs/${run.id}/notes`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось загрузить заметки");
      }
      setNotes(payload.notes ?? []);
      setNotesLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    }
  };

  const loadDecisions = async () => {
    try {
      const response = await fetch(`/api/app/decisions?sourceType=pilot&sourceId=${run.id}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) return;
      setDecisions(payload.decisions ?? []);
    } finally {
      setDecisionsLoaded(true);
    }
  };

  useEffect(() => {
    void loadDecisions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.id]);

  const updateStatus = async () => {
    setMetaUpdating(true);
    setError(null);
    try {
      const response = await fetch(`/api/app/pilot/runs/${run.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: metaForm.status,
          targetCycleId: metaForm.targetCycleId || null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось обновить пилот");
      }
      setRun(payload.run);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setMetaUpdating(false);
    }
  };

  const updateStepStatus = async (stepId: string, status: PilotRunStepDTO["status"]) => {
    setStepUpdating(stepId);
    setError(null);
    try {
      const response = await fetch(`/api/app/pilot/runs/${run.id}/steps/${stepId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось обновить шаг");
      }
      setRun((prev) => ({
        ...prev,
        steps: prev.steps.map((step) => (step.id === stepId ? { ...step, status: payload.step.status } : step)),
        summaryProgress: buildSummary({
          ...prev,
          steps: prev.steps.map((step) => (step.id === stepId ? { ...step, status: payload.step.status } : step)),
        }),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setStepUpdating(null);
    }
  };

  const addNote = async () => {
    setError(null);
    try {
      const response = await fetch(`/api/app/pilot/runs/${run.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...noteForm,
          relatedTeamId: noteForm.relatedTeamId || undefined,
          relatedScenarioId: noteForm.relatedScenarioId || undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось сохранить заметку");
      }
      setNoteForm({ type: "meeting", title: "", body: "", relatedTeamId: "", relatedScenarioId: "" });
      await loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    }
  };

  const generateScenario = async (teamId: string) => {
    setScenarioLoading(teamId);
    setError(null);
    try {
      const response = await fetch("/api/app/moves/scenarios/suggest-from-risks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось создать сценарий");
      }
      router.push(`/app/moves/scenarios/${payload.scenario.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setScenarioLoading(null);
    }
  };

  const createPilotReport = async () => {
    setError(null);
    try {
      const response = await fetch("/api/app/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "pilot",
          title: `Отчёт по пилоту ${run.name}`,
          pilotRunId: run.id,
          autoGenerate: true,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось создать отчёт");
      }
      router.push(`/app/reports/${payload.report.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания отчёта");
    }
  };

  const stepLinks: Record<string, string> = {
    configure_roles: "/app/moves/roles",
    launch_assessment: "/app/assessments",
    review_results: "/app/analytics",
    create_moves_scenario: "/app/moves",
    assign_quests: "/app/quests",
    final_report: "/app/reports",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Пилот Quadrant</p>
          <h1 className="text-3xl font-semibold text-brand-text">{run.name}</h1>
          <p className="text-sm text-slate-600">{run.description ?? "Описание не указано"}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            <Tag variant="outline">Статус: {formatStatus(run.status)}</Tag>
            <Tag variant="outline">Команд: {run.teams.length}</Tag>
            <Tag variant="outline">
              Прогресс: {run.summaryProgress.completedSteps}/{run.summaryProgress.totalSteps} ({run.summaryProgress.percent}
              %)
            </Tag>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 text-sm text-slate-600">
          <div className="flex gap-2">
            <select
              value={metaForm.status}
              onChange={(event) => setMetaForm((prev) => ({ ...prev, status: event.target.value as PilotRunDTO["status"] }))}
              className="rounded-xl border border-brand-border px-3 py-2 text-sm"
            >
              <option value="draft">Черновик</option>
              <option value="active">Активен</option>
              <option value="completed">Завершён</option>
              <option value="archived">Архив</option>
            </select>
            <select
              value={metaForm.targetCycleId}
              onChange={(event) => setMetaForm((prev) => ({ ...prev, targetCycleId: event.target.value }))}
              className="rounded-xl border border-brand-border px-3 py-2 text-sm"
            >
              <option value="">Цикл оценки не выбран</option>
              {cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.name} ({cycle.status})
                </option>
              ))}
            </select>
            <PrimaryButton onClick={() => void updateStatus()} disabled={metaUpdating} className="px-4 py-2">
              Сохранить
            </PrimaryButton>
          </div>
          <div className="flex gap-2">
            <SecondaryButton href="/app/pilot" className="px-3 py-1 text-xs">
              Все пилоты
            </SecondaryButton>
            <PrimaryButton onClick={() => void createPilotReport()} className="px-3 py-1 text-xs">
              Собрать отчёт по пилоту
            </PrimaryButton>
          </div>
        </div>
      </div>

      {error && <Card className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Шаги пилота</p>
              <h2 className="text-xl font-semibold text-brand-text">Плейбук</h2>
            </div>
            <p className="text-sm text-slate-500">
              {run.summaryProgress.completedSteps}/{run.summaryProgress.totalSteps} завершено
            </p>
          </div>
          <div className="mt-3 space-y-3">
            {run.steps.map((step) => (
              <div key={step.id} className="rounded-2xl border border-white/60 bg-white/90 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-brand-text">{step.title}</p>
                    <p className="text-xs text-slate-500">{step.description ?? "Описание шага"}</p>
                    {stepLinks[step.key] && (
                      <Link href={stepLinks[step.key]} className="mt-1 inline-flex text-xs font-semibold text-brand-primary">
                        Открыть модуль →
                      </Link>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag variant="outline">{formatStepStatus(step.status)}</Tag>
                    <div className="flex gap-2">
                      <SecondaryButton
                        onClick={() => void updateStepStatus(step.id, "in_progress")}
                        className="px-3 py-1 text-xs"
                        disabled={stepUpdating === step.id}
                      >
                        В процессе
                      </SecondaryButton>
                      <PrimaryButton
                        onClick={() => void updateStepStatus(step.id, "done")}
                        className="px-3 py-1 text-xs"
                        disabled={stepUpdating === step.id}
                      >
                        Сделано
                      </PrimaryButton>
                      <SecondaryButton
                        onClick={() => void updateStepStatus(step.id, "skipped")}
                        className="px-3 py-1 text-xs"
                        disabled={stepUpdating === step.id}
                      >
                        Пропустить
                      </SecondaryButton>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Команды в пилоте</p>
          {run.teams.length === 0 ? (
            <p className="text-sm text-slate-500">Команды не выбраны.</p>
          ) : (
            <div className="space-y-2">
              {run.teams.map((team) => (
                <div key={team.teamId} className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-600">
                  <p className="font-semibold text-brand-text">{team.teamName}</p>
                  <div className="mt-1 flex gap-2 text-xs text-slate-500">
                    <Link href={`/app/team/${team.teamId}`} className="text-brand-primary">
                      Открыть команду →
                    </Link>
                    <button
                      type="button"
                      onClick={() => void generateScenario(team.teamId)}
                      className="text-brand-primary disabled:text-slate-400"
                      disabled={scenarioLoading === team.teamId}
                    >
                      Сценарий для команды
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="rounded-2xl border border-brand-border/60 bg-brand-muted p-3 text-xs text-slate-600">
            Привяжите цикл оценки, чтобы шаги «Оценка» и «Результаты» были проще: выберите готовый цикл или создайте на
            странице «Оценки навыков».
          </div>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Решения по этому пилоту</p>
            <h2 className="text-xl font-semibold text-brand-text">Повышения / риски / переводы</h2>
          </div>
          <PrimaryButton href="/app/decisions" className="px-3 py-1 text-xs">
            Открыть борд
          </PrimaryButton>
        </div>
        {decisionsLoaded && decisions.length === 0 && <p className="text-sm text-slate-500">Пока нет решений, связанных с этим пилотом.</p>}
        {!decisionsLoaded && <p className="text-sm text-slate-500">Загружаем решения…</p>}
        {decisions.length > 0 && (
          <div className="space-y-2">
            {decisions.map((decision) => (
              <div key={decision.id} className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-brand-text">{decision.title}</p>
                    <p className="text-xs text-slate-500">
                      {decision.employeeName} · {decision.employeeRole ?? "роль не указана"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Тип: {decision.type} · Статус: {decision.status}
                    </p>
                  </div>
                  <PrimaryButton href={`/app/decisions`} className="px-3 py-1 text-xs">
                    Подробнее
                  </PrimaryButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Заметки и решения</p>
            <h2 className="text-xl font-semibold text-brand-text">Что обсудили и решили</h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <select
              value={filterType}
              onChange={(event) => setFilterType(event.target.value)}
              className="rounded-xl border border-brand-border px-3 py-2 text-sm"
            >
              <option value="all">Все</option>
              <option value="meeting">Встречи</option>
              <option value="insight">Инсайты</option>
              <option value="risk">Риски</option>
              <option value="decision">Решения</option>
            </select>
            <SecondaryButton onClick={() => void loadNotes()} className="px-3 py-1 text-xs">
              Обновить
            </SecondaryButton>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            {notesLoaded && filteredNotes.length === 0 && (
              <p className="text-sm text-slate-500">Заметок пока нет. Добавьте первую после встречи.</p>
            )}
            {!notesLoaded && (
              <p className="text-sm text-slate-500">Нажмите «Обновить», чтобы загрузить заметки по пилоту.</p>
            )}
            {filteredNotes.map((note) => (
              <div key={note.id} className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-600">
                <div className="flex items-center justify-between gap-2">
                  <Tag variant="outline">{formatNoteType(note.type)}</Tag>
                  <p className="text-xs text-slate-500">{new Date(note.createdAt).toLocaleDateString("ru-RU")}</p>
                </div>
                <p className="mt-1 font-semibold text-brand-text">{note.title}</p>
                <p className="text-xs text-slate-500">{note.body}</p>
                {note.relatedScenarioId && (
                  <Link href={`/app/moves/scenarios/${note.relatedScenarioId}`} className="text-xs font-semibold text-brand-primary">
                    Сценарий перемещений →
                  </Link>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-2 rounded-2xl border border-brand-border/60 bg-brand-muted p-3">
            <p className="text-sm font-semibold text-brand-text">Добавить заметку</p>
            <select
              value={noteForm.type}
              onChange={(event) => setNoteForm((prev) => ({ ...prev, type: event.target.value }))}
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
            >
              <option value="meeting">Встреча</option>
              <option value="insight">Инсайт</option>
              <option value="risk">Риск</option>
              <option value="decision">Решение</option>
            </select>
            <input
              value={noteForm.title}
              onChange={(event) => setNoteForm((prev) => ({ ...prev, title: event.target.value }))}
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
              placeholder="Заголовок заметки"
            />
            <textarea
              value={noteForm.body}
              onChange={(event) => setNoteForm((prev) => ({ ...prev, body: event.target.value }))}
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
              placeholder="Краткое содержание"
              rows={3}
            />
            <input
              value={noteForm.relatedTeamId}
              onChange={(event) => setNoteForm((prev) => ({ ...prev, relatedTeamId: event.target.value }))}
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
              placeholder="ID команды (опционально)"
            />
            <input
              value={noteForm.relatedScenarioId}
              onChange={(event) => setNoteForm((prev) => ({ ...prev, relatedScenarioId: event.target.value }))}
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
              placeholder="ID сценария перемещений (опционально)"
            />
            <PrimaryButton onClick={() => void addNote()} className="w-full px-4 py-2">
              Сохранить заметку
            </PrimaryButton>
          </div>
        </div>
      </Card>
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

function formatStepStatus(status: string) {
  const map: Record<string, string> = {
    pending: "Не начат",
    in_progress: "В процессе",
    done: "Готово",
    skipped: "Пропущено",
  };
  return map[status] ?? status;
}

function formatNoteType(type: string) {
  const map: Record<string, string> = {
    meeting: "Встреча",
    insight: "Инсайт",
    risk: "Риск",
    decision: "Решение",
  };
  return map[type] ?? type;
}

function buildSummary(run: PilotRunDTO) {
  const totalSteps = run.steps.length;
  const completedSteps = run.steps.filter((step) => step.status === "done").length;
  const percent = totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);
  const lateStepsCount = run.steps.filter((step) => {
    if (!step.dueDate || step.status === "done") return false;
    const due = new Date(step.dueDate).getTime();
    return Number.isFinite(due) && due < Date.now();
  }).length;
  return { totalSteps, completedSteps, percent, lateStepsCount };
}

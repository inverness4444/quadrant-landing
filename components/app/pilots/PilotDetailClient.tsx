"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { PilotRun, PilotRunParticipant } from "@/drizzle/schema";
import type { FeedbackSurvey } from "@/drizzle/schema";
import PilotOutcomeSection from "@/components/app/pilots/PilotOutcomeSection";

type ParticipantWithName = PilotRunParticipant & { employeeName?: string | null };

type Props = {
  initialPilot: PilotRun;
  initialParticipants: ParticipantWithName[];
};

export default function PilotDetailClient({ initialPilot, initialParticipants }: Props) {
  const [pilot, setPilot] = useState(initialPilot);
  const [participants, setParticipants] = useState<ParticipantWithName[]>(initialParticipants);
  const [employeeOptions, setEmployeeOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(() => initialParticipants.map((p) => p.employeeId));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [surveys, setSurveys] = useState<FeedbackSurvey[]>([]);
  const params = useSearchParams();
  const participantsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void loadEmployees();
    void loadSurveys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSurveys = async () => {
    try {
      const resp = await fetch(`/api/app/feedback/surveys?type=pilot`, { cache: "no-store" });
      const json = await resp.json().catch(() => null);
      if (resp.ok && json?.surveys) {
        const linked = (json.surveys as Array<FeedbackSurvey & { linkedPilotId?: string | null }>).filter(
          (s) => s.linkedPilotId === pilot.id,
        );
        setSurveys(linked);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (params?.get("focus") === "participants" && participantsRef.current) {
      participantsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [params]);

  const loadEmployees = async () => {
    try {
      const resp = await fetch("/api/app/employees", { cache: "no-store" });
      const json = await resp.json().catch(() => null);
      if (resp.ok && json?.employees) {
        setEmployeeOptions(json.employees);
      }
    } catch {
      // ignore
    }
  };

  const saveParticipants = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const resp = await fetch(`/api/app/pilots/${pilot.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIds: selectedEmployees }),
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || !json?.ok) throw new Error(json?.error?.message ?? "Не удалось сохранить участников");
      setParticipants(json.participants ?? []);
      setMessage("Участники сохранены");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (status: PilotRun["status"]) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const resp = await fetch(`/api/app/pilots/${pilot.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || !json?.ok) throw new Error(json?.error?.message ?? "Не удалось обновить статус");
      setPilot(json.pilot);
      setParticipants(json.participants ?? participants);
      setMessage("Статус обновлён");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const statusActions = useMemo(() => {
    const actions: Array<{ label: string; status: PilotRun["status"] }> = [];
    if (pilot.status === "draft" || pilot.status === "planned") {
      actions.push({ label: "Запустить пилот", status: "active" });
    }
    if (pilot.status === "active") {
      actions.push({ label: "Завершить", status: "completed" });
      actions.push({ label: "Отменить", status: "cancelled" });
    }
    if (pilot.status === "cancelled" || pilot.status === "completed") {
      actions.push({ label: "Вернуть в черновик", status: "draft" });
    }
    return actions;
  }, [pilot.status]);

  return (
    <>
      <div className="space-y-6">
        <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Pilot</p>
            <h1 className="text-3xl font-semibold text-brand-text">{pilot.name}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              <Tag variant="outline">Статус: {formatStatus(pilot.status)}</Tag>
              {pilot.startDate && <Tag variant="outline">Старт: {formatDate(pilot.startDate)}</Tag>}
              {pilot.endDate && <Tag variant="outline">Финиш: {formatDate(pilot.endDate)}</Tag>}
            </div>
            {pilot.targetAudience && <p className="text-sm text-slate-600">Целевая аудитория: {pilot.targetAudience}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {statusActions.map((action) => (
              <PrimaryButton key={action.status} onClick={() => void changeStatus(action.status)} disabled={loading} className="px-3 py-1 text-xs">
                {action.label}
              </PrimaryButton>
            ))}
          </div>
        </div>
        {pilot.description && <p className="text-sm text-slate-700">{pilot.description}</p>}
        {pilot.successCriteria && (
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-semibold text-brand-text">Критерии успеха</p>
            <p>{pilot.successCriteria}</p>
          </div>
        )}
        {pilot.notes && (
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-semibold text-brand-text">Заметки</p>
            <p>{pilot.notes}</p>
          </div>
        )}
        {message && <p className="text-sm text-emerald-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>

      <Card ref={participantsRef} className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Участники</p>
            <h2 className="text-xl font-semibold text-brand-text">Кто в пилоте</h2>
          </div>
          <SecondaryButton onClick={() => void saveParticipants()} disabled={loading} className="px-3 py-1 text-xs">
            Сохранить участников
          </SecondaryButton>
        </div>
        <p className="text-sm text-slate-600">Выберите сотрудников, которые участвуют в этом пилоте. Пока простая форма — позже добавим роли и шаги.</p>
        <div className="flex flex-wrap gap-2">
          {employeeOptions.map((emp) => {
            const checked = selectedEmployees.includes(emp.id);
            return (
              <label key={emp.id} className="flex items-center gap-2 rounded-full border border-brand-border px-3 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    setSelectedEmployees((prev) => (e.target.checked ? [...prev, emp.id] : prev.filter((id) => id !== emp.id)))
                  }
                />
                {emp.name}
              </label>
            );
          })}
          {employeeOptions.length === 0 && <p className="text-sm text-slate-500">Сотрудники не найдены.</p>}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-brand-text">Текущий список</p>
          {participants.length === 0 && <p className="text-sm text-slate-500">Участников пока нет.</p>}
          <ul className="space-y-1 text-sm text-slate-700">
            {participants.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg border border-brand-border/50 bg-white/80 px-3 py-2">
                <span>{p.employeeName ?? p.employeeId}</span>
                {p.roleInPilot && <span className="text-xs text-slate-500">{p.roleInPilot}</span>}
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Опросы</p>
            <h2 className="text-xl font-semibold text-brand-text">Опросы по пилоту</h2>
          </div>
        </div>
        {surveys.length === 0 && <p className="text-sm text-slate-500">Опросы для этого пилота не найдены.</p>}
        <div className="space-y-2">
          {surveys.map((s) => (
            <div key={s.id} className="rounded-xl border border-brand-border/50 bg-white/90 p-3 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-brand-text">{s.title}</p>
                  <p className="text-xs text-slate-500">Статус: {s.status}</p>
                </div>
                <PrimaryButton href={`/app/feedback/surveys/${s.id}/stats`} className="px-3 py-1 text-xs">
                  Статистика
                </PrimaryButton>
              </div>
            </div>
          ))}
        </div>
      </Card>
      </div>
      <PilotOutcomeSection pilotId={pilot.id} canEdit />
    </>
  );
}

function formatStatus(status: PilotRun["status"]) {
  const map: Record<PilotRun["status"], string> = {
    draft: "Черновик",
    planned: "Запланирован",
    active: "Активен",
    completed: "Завершён",
    cancelled: "Отменён",
    archived: "Архив",
  };
  return map[status] ?? status;
}

function formatDate(date: string | null) {
  if (!date) return "–";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("ru-RU");
}

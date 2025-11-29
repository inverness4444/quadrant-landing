"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import type { PilotRun } from "@/drizzle/schema";

type EmployeeOption = { id: string; name: string };

export default function PilotWizardNewClient() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pilot, setPilot] = useState<PilotRun | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    targetAudience: "",
    successCriteria: "",
    startDate: "",
    endDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadEmployees();
  }, []);

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

  const canContinueStep1 = useMemo(() => form.name.trim().length >= 2, [form.name]);

  const saveStep1 = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/app/pilots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          targetAudience: form.targetAudience || null,
          successCriteria: form.successCriteria || null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          status: "draft",
        }),
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || !json?.ok) throw new Error(json?.error?.message ?? "Не удалось сохранить пилот");
      setPilot(json.pilot);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const saveParticipants = async () => {
    if (!pilot) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/app/pilots/${pilot.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIds: participants }),
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || !json?.ok) throw new Error(json?.error?.message ?? "Не удалось сохранить участников");
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const launchPilot = async (status: PilotRun["status"]) => {
    if (!pilot) return;
    setLoading(true);
    setError(null);
    try {
      if (status === "active") {
        await fetch(`/api/app/pilots/${pilot.id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
      }
      window.location.href = `/app/pilots/${pilot.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Pilot wizard</p>
        <h1 className="text-3xl font-semibold text-brand-text">Создать пилот</h1>
        <p className="text-sm text-slate-600">Простой мастер из трёх шагов: базовые данные, участники, подтверждение.</p>
      </div>
      {error && <Card className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>}
      <Card className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <TagStep active={step === 1}>Шаг 1. Основное</TagStep>
          <TagStep active={step === 2}>Шаг 2. Участники</TagStep>
          <TagStep active={step === 3}>Шаг 3. Подтверждение</TagStep>
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <label className="block space-y-1 text-sm text-slate-700">
              Название пилота *
              <input
                className="w-full rounded-xl border border-brand-border px-3 py-2"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Например, Онбординг middle backend"
              />
            </label>
            <label className="block space-y-1 text-sm text-slate-700">
              Описание
              <textarea
                className="w-full rounded-xl border border-brand-border px-3 py-2"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block space-y-1 text-sm text-slate-700">
                Целевая аудитория
                <input
                  className="w-full rounded-xl border border-brand-border px-3 py-2"
                  value={form.targetAudience}
                  onChange={(e) => setForm((prev) => ({ ...prev, targetAudience: e.target.value }))}
                  placeholder="Команда продукта, аналитики..."
                />
              </label>
              <label className="block space-y-1 text-sm text-slate-700">
                Критерии успеха
                <input
                  className="w-full rounded-xl border border-brand-border px-3 py-2"
                  value={form.successCriteria}
                  onChange={(e) => setForm((prev) => ({ ...prev, successCriteria: e.target.value }))}
                  placeholder="Измеримые метрики, цели"
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block space-y-1 text-sm text-slate-700">
                Дата старта
                <input
                  type="date"
                  className="w-full rounded-xl border border-brand-border px-3 py-2"
                  value={form.startDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </label>
              <label className="block space-y-1 text-sm text-slate-700">
                Дата окончания
                <input
                  type="date"
                  className="w-full rounded-xl border border-brand-border px-3 py-2"
                  value={form.endDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <SecondaryButton href="/app/pilots">Отмена</SecondaryButton>
              <PrimaryButton disabled={!canContinueStep1 || loading} onClick={() => void saveStep1()}>
                Далее
              </PrimaryButton>
            </div>
          </div>
        )}

        {step === 2 && pilot && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Выберите участников пилота. Вы всегда сможете изменить список позже.</p>
            <div className="flex flex-wrap gap-2">
              {employeeOptions.map((emp) => {
                const checked = participants.includes(emp.id);
                return (
                  <label key={emp.id} className="flex items-center gap-2 rounded-full border border-brand-border px-3 py-1 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setParticipants((prev) => (e.target.checked ? [...prev, emp.id] : prev.filter((id) => id !== emp.id)))}
                    />
                    {emp.name}
                  </label>
                );
              })}
            </div>
            {employeeOptions.length === 0 && <p className="text-sm text-slate-500">Сотрудников не найдено.</p>}
            <div className="flex justify-between gap-2">
              <SecondaryButton onClick={() => setStep(1)}>Назад</SecondaryButton>
              <PrimaryButton disabled={loading} onClick={() => void saveParticipants()}>
                Далее
              </PrimaryButton>
            </div>
          </div>
        )}

        {step === 3 && pilot && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Проверьте сводку и запускайте пилот или сохраните как черновик.</p>
            <Card className="bg-slate-50 text-sm text-slate-700">
              <p className="font-semibold text-brand-text">{pilot.name}</p>
              <p>{pilot.description ?? "Описание не указано"}</p>
              <p className="text-xs text-slate-500">
                {form.startDate ? `Старт: ${form.startDate}` : "Старт не указан"} · {form.endDate ? `Финиш: ${form.endDate}` : "Финиш не указан"}
              </p>
              <p className="text-xs text-slate-500">Участников: {participants.length}</p>
            </Card>
            <div className="flex justify-between gap-2">
              <SecondaryButton onClick={() => setStep(2)}>Назад</SecondaryButton>
              <div className="flex gap-2">
                <SecondaryButton disabled={loading} onClick={() => void launchPilot("draft")}>
                  Сохранить как черновик
                </SecondaryButton>
                <PrimaryButton disabled={loading} onClick={() => void launchPilot("active")}>
                  Запустить пилот
                </PrimaryButton>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function TagStep({ children, active }: { children: ReactNode; active: boolean }) {
  return <span className={`rounded-full px-3 py-1 ${active ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-600"}`}>{children}</span>;
}

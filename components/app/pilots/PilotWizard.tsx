"use client";

import { useEffect, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import type { PilotTemplateSummary } from "@/services/pilotTemplateService";
import type { PilotWizardPreview } from "@/services/pilotWizardService";

type Props = {
  template: PilotTemplateSummary;
  onClose: () => void;
  preselectedEmployeeId?: string;
};

export default function PilotWizard({ template, onClose, preselectedEmployeeId }: Props) {
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [employeeId, setEmployeeId] = useState(preselectedEmployeeId ?? "");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [preview, setPreview] = useState<PilotWizardPreview | null>(null);
  const [customTitle, setCustomTitle] = useState(template.title);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPilotId, setCreatedPilotId] = useState<string | null>(null);

  useEffect(() => {
    void loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const res = await fetch("/api/app/employees", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.employees) {
        setEmployees(json.employees);
      }
    } catch {
      // ignore
    }
  };

  const buildPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/app/pilots/preview-from-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, templateId: template.id, startDate }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error?.message ?? "Не удалось построить превью");
      setPreview(json.preview);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const createPilot = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/app/pilots/create-from-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, templateId: template.id, startDate, customTitle }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error?.message ?? "Не удалось создать пилот");
      setCreatedPilotId(json.pilotId);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="fixed inset-0 z-40 m-4 overflow-y-auto border border-brand-border/60 bg-white p-4 shadow-2xl lg:inset-auto lg:left-1/2 lg:top-16 lg:w-[720px] lg:-translate-x-1/2 lg:rounded-3xl">
      <div className="flex items-center justify-between border-b border-brand-border/50 pb-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Pilot wizard</p>
          <h2 className="text-xl font-semibold text-brand-text">Создать пилот из шаблона</h2>
        </div>
        <button type="button" className="text-slate-500" onClick={onClose}>
          ×
        </button>
      </div>

      {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>}

      {step === 1 && (
        <div className="space-y-3 pt-3">
          <label className="space-y-1 text-sm text-slate-600">
            Сотрудник
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm">
              <option value="">Выберите сотрудника</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-600">
            Дата старта
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm" />
          </label>
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={onClose}>Отмена</SecondaryButton>
            <PrimaryButton disabled={!employeeId || loading} onClick={() => void buildPreview()}>
              Дальше
            </PrimaryButton>
          </div>
        </div>
      )}

      {step === 2 && preview && (
        <div className="space-y-3 pt-3">
          <div>
            <p className="text-sm text-slate-600">{template.description}</p>
            <p className="text-xs text-slate-500">
              Период: {new Date(preview.plannedStartDate).toLocaleDateString()} — {new Date(preview.plannedEndDate).toLocaleDateString()}
            </p>
          </div>
          <label className="space-y-1 text-sm text-slate-600">
            Название пилота
            <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm" />
          </label>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-brand-text">Шаги</p>
            <div className="space-y-2">
              {preview.steps.map((stepItem, idx) => (
                <div key={idx} className="rounded-xl border border-brand-border/50 bg-white p-3 text-sm">
                  <p className="font-semibold text-brand-text">{stepItem.title}</p>
                  <p className="text-slate-600">{stepItem.description}</p>
                  <p className="text-xs text-slate-500">Дедлайн: {new Date(stepItem.dueDate).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between gap-2">
            <SecondaryButton onClick={() => setStep(1)}>Назад</SecondaryButton>
            <PrimaryButton disabled={loading} onClick={() => void createPilot()}>
              Создать пилот
            </PrimaryButton>
          </div>
        </div>
      )}

      {step === 3 && createdPilotId && (
        <div className="space-y-3 pt-3">
          <p className="text-lg font-semibold text-brand-text">Пилот создан</p>
          <div className="flex gap-2">
            <PrimaryButton href={`/app/pilot/${createdPilotId}`}>Открыть пилот</PrimaryButton>
            <SecondaryButton onClick={onClose}>Закрыть</SecondaryButton>
          </div>
        </div>
      )}
    </Card>
  );
}

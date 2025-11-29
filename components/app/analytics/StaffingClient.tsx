"use client";

import { useMemo, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { Skill } from "@/drizzle/schema";
import type { ProjectStaffingResult } from "@/services/types/analytics";

const LEVEL_OPTIONS = [1, 2, 3, 4, 5];

type RequirementRow = {
  id: string;
  skillId: string;
  minLevel: number;
};

type StaffingClientProps = {
  skills: Skill[];
};

export default function StaffingClient({ skills }: StaffingClientProps) {
  const [projectName, setProjectName] = useState("Новый проект");
  const [requirements, setRequirements] = useState<RequirementRow[]>(() =>
    skills.length > 0
      ? [
          {
            id: generateId(),
            skillId: skills[0].id,
            minLevel: 3,
          },
        ]
      : [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProjectStaffingResult | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const skillMap = useMemo(() => new Map(skills.map((skill) => [skill.id, skill])), [skills]);

  const handleRequirementChange = (id: string, field: "skillId" | "minLevel", value: string) => {
    setRequirements((current) =>
      current.map((req) => {
        if (req.id !== id) return req;
        if (field === "skillId") {
          return { ...req, skillId: value };
        }
        return { ...req, minLevel: Number(value) };
      }),
    );
  };

  const addRequirement = () => {
    if (skills.length === 0) return;
    setRequirements((current) => [
      ...current,
      {
        id: generateId(),
        skillId: skills[0].id,
        minLevel: 3,
      },
    ]);
  };

  const removeRequirement = (id: string) => {
    setRequirements((current) => current.filter((req) => req.id !== id));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (requirements.length === 0) {
      setError("Добавьте хотя бы одно требование по навыку");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/app/analytics/staffing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requiredSkills: requirements.map((req) => ({ skillId: req.skillId, minLevel: req.minLevel })),
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | (ProjectStaffingResult & { ok?: boolean; error?: { message?: string } })
        | null;
      if (!response.ok || !payload) {
        throw new Error(payload?.error?.message ?? "Не удалось подобрать команду");
      }
      setResult({
        candidates: payload.candidates,
        warnings: payload.warnings,
      });
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  const warnings = result?.warnings ?? [];
  const candidates = result?.candidates ?? [];

  const requirementsValid = requirements.every((req) => Boolean(skillMap.get(req.skillId)));
  const canSubmit = !loading && requirementsValid && requirements.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Подбор команды</p>
        <h1 className="text-3xl font-semibold text-brand-text">Соберите проектную команду</h1>
        <p className="text-base text-slate-600">
          Quadrant использует карту навыков, чтобы предложить людей под конкретные требования и предупредить о рисках.
        </p>
      </div>

      <Card>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="space-y-2 text-sm text-slate-500">
              <span className="text-xs uppercase tracking-wide text-slate-400">Название инициативы</span>
              <input
                className="h-12 w-full rounded-2xl border border-brand-border px-4"
                placeholder="Например, Новый биллинг"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
              />
            </label>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-text">Требуемые навыки</p>
                <p className="text-xs text-slate-500">Укажите компетенции и желаемый уровень.</p>
              </div>
              <SecondaryButton type="button" onClick={addRequirement} disabled={skills.length === 0} className="px-4 py-2">
                Добавить навык
              </SecondaryButton>
            </div>
            {skills.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-brand-border/60 bg-white/70 p-4 text-sm text-slate-500">
                Сначала создайте навыки в разделе «Навыки», чтобы подобрать команду.
              </p>
            ) : (
              <div className="space-y-3">
                {requirements.map((req) => (
                  <div key={req.id} className="flex flex-col gap-2 rounded-2xl border border-white/60 bg-white/80 p-4 md:flex-row md:items-center">
                    <select
                      className="h-11 flex-1 rounded-2xl border border-brand-border px-4 text-sm"
                      value={req.skillId}
                      onChange={(event) => handleRequirementChange(req.id, "skillId", event.target.value)}
                    >
                      {skills.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Уровень</span>
                      <select
                        className="h-11 rounded-2xl border border-brand-border px-4 text-sm"
                        value={req.minLevel}
                        onChange={(event) => handleRequirementChange(req.id, "minLevel", event.target.value)}
                      >
                        {LEVEL_OPTIONS.map((level) => (
                          <option key={`${req.id}-${level}`} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </div>
                    {requirements.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRequirement(req.id)}
                        className="text-xs font-semibold text-red-500"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <PrimaryButton type="submit" disabled={!canSubmit} className="px-6 py-3">
            {loading ? "Подбираем..." : "Подобрать команду"}
          </PrimaryButton>
        </form>
      </Card>

      {submitted && !loading && !result && !error && (
        <Card className="text-sm text-slate-500">Пока нет данных для такого набора навыков.</Card>
      )}

      {result && (
        <Card className="space-y-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Результаты</p>
              <h2 className="text-xl font-semibold text-brand-text">Кандидаты для «{projectName || "Проект"}»</h2>
              <p className="text-sm text-slate-500">
                {candidates.length > 0
                  ? `${candidates.length} человек подходят под требования.`
                  : "Сейчас нет достаточного покрытия навыков под такие требования."}
              </p>
            </div>
            <SecondaryButton href="/app/analytics">Открыть аналитику</SecondaryButton>
          </div>

          {candidates.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              {candidates.map((candidate) => (
                <div key={candidate.employeeId} className="rounded-3xl border border-white/60 bg-white/90 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-brand-text">{candidate.name}</p>
                      <p className="text-xs text-slate-500">{candidate.position}</p>
                    </div>
                    <span className="text-sm font-semibold text-brand-primary">Совпадение {candidate.fitScore}%</span>
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">Покрытие навыков</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {candidate.matchingSkills.length > 0 ? (
                      candidate.matchingSkills.map((skill) => (
                        <Tag key={`${candidate.employeeId}-${skill.skillId}`}>
                          {skill.name} · {skill.level}/5
                        </Tag>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">Нет совпадающих навыков</span>
                    )}
                  </div>
                  {candidate.missingSkills.length > 0 && (
                    <p className="mt-2 text-xs text-slate-500">
                      Не хватает: {candidate.missingSkills.map((skill) => skill.name).join(", ")}
                    </p>
                  )}
                  {candidate.riskFlags.length > 0 && (
                    <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs text-amber-900">
                      {candidate.riskFlags.map((flag) => (
                        <p key={flag}>• {flag}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Предупреждения</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {warnings.map((warning) => (
                  <li key={warning.id}>{warning.title} — {warning.description}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

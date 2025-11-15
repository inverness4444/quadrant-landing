"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/common/Modal";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import type { EmployeeLevel, Skill, Track, TrackLevel } from "@/drizzle/schema";

export type EmployeeFormValues = {
  name: string;
  position: string;
  level: EmployeeLevel;
  primaryTrackId?: string | null;
  trackLevelId?: string | null;
  skills: Array<{ skillId: string; level: number }>;
};

type EmployeeFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: EmployeeFormValues) => Promise<void>;
  saving: boolean;
  skills: Skill[];
  tracks: Track[];
  trackLevels: TrackLevel[];
  initialValues?: EmployeeFormValues;
  error?: string | null;
};

const defaultValues: EmployeeFormValues = {
  name: "",
  position: "",
  level: "Junior",
  primaryTrackId: null,
  trackLevelId: null,
  skills: [],
};

export default function EmployeeFormModal({
  open,
  onClose,
  onSubmit,
  saving,
  skills,
  tracks,
  trackLevels,
  initialValues,
  error,
}: EmployeeFormModalProps) {
  const [form, setForm] = useState<EmployeeFormValues>(initialValues ?? defaultValues);

  useEffect(() => {
    setForm(initialValues ?? defaultValues);
  }, [initialValues, open]);

  const availableTrackLevels = useMemo(() => {
    if (!form.primaryTrackId) return [];
    return trackLevels
      .filter((level) => level.trackId === form.primaryTrackId)
      .sort((a, b) => a.order - b.order);
  }, [form.primaryTrackId, trackLevels]);

  useEffect(() => {
    if (
      form.trackLevelId &&
      !availableTrackLevels.some((level) => level.id === form.trackLevelId)
    ) {
      setForm((prev) => ({ ...prev, trackLevelId: null }));
    }
  }, [availableTrackLevels, form.trackLevelId]);

  const toggleSkill = (skillId: string) => {
    setForm((prev) => {
      const exists = prev.skills.find((skill) => skill.skillId === skillId);
      if (exists) {
        return { ...prev, skills: prev.skills.filter((skill) => skill.skillId !== skillId) };
      }
      return {
        ...prev,
        skills: [...prev.skills, { skillId, level: 3 }],
      };
    });
  };

  const updateSkillLevel = (skillId: string, level: number) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.map((skill) =>
        skill.skillId === skillId ? { ...skill, level } : skill,
      ),
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(form);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialValues ? "Редактировать сотрудника" : "Новый сотрудник"}
      description="Укажите роль, уровень и ключевые навыки — Quadrant подсветит сильные стороны команды."
      footer={
        <>
          <SecondaryButton
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2"
          >
            Отменить
          </SecondaryButton>
          <PrimaryButton type="submit" form="employee-form" disabled={saving} className="px-4 py-2">
            {saving ? "Сохраняем..." : "Сохранить"}
          </PrimaryButton>
        </>
      }
    >
      <form id="employee-form" className="space-y-4" onSubmit={handleSubmit}>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-600">
            Имя
            <input
              className="mt-1 h-11 w-full rounded-xl border border-brand-border px-4"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </label>
          <label className="text-sm text-slate-600">
            Позиция
            <input
              className="mt-1 h-11 w-full rounded-xl border border-brand-border px-4"
              value={form.position}
              onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))}
              required
            />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-600">
            Уровень
            <select
              className="mt-1 h-11 w-full rounded-xl border border-brand-border px-4"
              value={form.level}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, level: event.target.value as EmployeeLevel }))
              }
            >
              <option value="Junior">Junior</option>
              <option value="Middle">Middle</option>
              <option value="Senior">Senior</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Карьерный трек
            <select
              className="mt-1 h-11 w-full rounded-xl border border-brand-border px-4"
              value={form.primaryTrackId ?? ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  primaryTrackId: event.target.value || null,
                }))
              }
            >
              <option value="">Без трека</option>
              {tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {form.primaryTrackId && (
          <label className="text-sm text-slate-600">
            Уровень в треке
            <select
              className="mt-1 h-11 w-full rounded-xl border border-brand-border px-4"
              value={form.trackLevelId ?? ""}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, trackLevelId: event.target.value || null }))
              }
            >
              <option value="">Без уровня</option>
              {availableTrackLevels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div>
          <p className="text-sm font-semibold text-slate-600">Навыки</p>
          <div className="mt-2 grid gap-2 max-h-60 overflow-y-auto rounded-2xl border border-dashed border-brand-border p-3">
            {skills.map((skill) => {
              const selected = form.skills.find((entry) => entry.skillId === skill.id);
              return (
                <label
                  key={skill.id}
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-brand-muted"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(selected)}
                      onChange={() => toggleSkill(skill.id)}
                    />
                    {skill.name}
                  </span>
                  {selected && (
                    <select
                      className="rounded-lg border border-brand-border px-2 py-1 text-xs"
                      value={selected.level}
                      onChange={(event) =>
                        updateSkillLevel(skill.id, Number(event.target.value) || 1)
                      }
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <option key={value} value={value}>
                          {value}/5
                        </option>
                      ))}
                    </select>
                  )}
                </label>
              );
            })}
            {skills.length === 0 && (
              <p className="text-sm text-slate-500">
                Добавьте навыки на вкладке «Навыки», чтобы привязать их к сотрудникам.
              </p>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}

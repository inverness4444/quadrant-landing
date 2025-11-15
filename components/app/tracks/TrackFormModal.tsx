"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/common/Modal";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";

type TrackFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; levels: Array<{ name: string; description: string }> }) => Promise<void>;
  saving: boolean;
  error?: string | null;
};

const defaultLevels = [
  { name: "Junior", description: "Входит в роль и выполняет задачи под присмотром" },
  { name: "Middle", description: "Самостоятельно ведёт фичи и отвечает за качество" },
  { name: "Senior", description: "Проектирует решения, менторит других" },
];

export default function TrackFormModal({ open, onClose, onSubmit, saving, error }: TrackFormModalProps) {
  const [name, setName] = useState("");
  const [levels, setLevels] = useState(defaultLevels);

  useEffect(() => {
    if (open) {
      setName("");
      setLevels(defaultLevels);
    }
  }, [open]);

  const updateLevel = (index: number, field: "name" | "description", value: string) => {
    setLevels((prev) =>
      prev.map((level, idx) => (idx === index ? { ...level, [field]: value } : level)),
    );
  };

  const addLevel = () => {
    setLevels((prev) => [...prev, { name: `Уровень ${prev.length + 1}`, description: "" }]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      name,
      levels: levels.filter((level) => level.name.trim()),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Новый карьерный трек"
      description="Опишите уровни развития — Quadrant покажет прогресс команды."
      footer={
        <>
          <SecondaryButton type="button" onClick={onClose} disabled={saving}>
            Отменить
          </SecondaryButton>
          <PrimaryButton type="submit" form="track-form" disabled={saving}>
            {saving ? "Сохраняем..." : "Создать"}
          </PrimaryButton>
        </>
      }
    >
      <form id="track-form" className="space-y-4" onSubmit={handleSubmit}>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <label className="text-sm text-slate-600">
          Название трека
          <input
            className="mt-1 h-11 w-full rounded-xl border border-brand-border px-4"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-600">Уровни</p>
            <button type="button" className="text-sm font-semibold text-brand-link" onClick={addLevel}>
              + Добавить уровень
            </button>
          </div>
          {levels.map((level, index) => (
            <div key={index} className="rounded-2xl border border-brand-border p-3">
              <label className="text-xs uppercase text-slate-400">
                Название уровня
                <input
                  className="mt-1 h-10 w-full rounded-xl border border-brand-border px-3"
                  value={level.name}
                  onChange={(event) => updateLevel(index, "name", event.target.value)}
                  required
                />
              </label>
              <label className="mt-2 text-xs uppercase text-slate-400">
                Описание
                <textarea
                  className="mt-1 w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
                  rows={2}
                  value={level.description}
                  onChange={(event) => updateLevel(index, "description", event.target.value)}
                />
              </label>
            </div>
          ))}
        </div>
      </form>
    </Modal>
  );
}

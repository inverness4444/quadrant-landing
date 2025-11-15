"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/common/Modal";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import type { SkillType } from "@/drizzle/schema";

type SkillFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: { name: string; type: SkillType }) => Promise<void>;
  saving: boolean;
  initialValues?: { name: string; type: SkillType };
  error?: string | null;
};

const defaultValues = { name: "", type: "hard" as SkillType };

export default function SkillFormModal({
  open,
  onClose,
  onSubmit,
  saving,
  initialValues,
  error,
}: SkillFormModalProps) {
  const [form, setForm] = useState(defaultValues);

  useEffect(() => {
    setForm(initialValues ?? defaultValues);
  }, [initialValues, open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(form);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialValues ? "Редактировать навык" : "Добавить навык"}
      description="Навыки помогают Quadrant понять, чем сильна команда."
      footer={
        <>
          <SecondaryButton type="button" onClick={onClose} disabled={saving}>
            Отменить
          </SecondaryButton>
          <PrimaryButton type="submit" form="skill-form" disabled={saving}>
            {saving ? "Сохраняем..." : "Сохранить"}
          </PrimaryButton>
        </>
      }
    >
      <form id="skill-form" className="space-y-4" onSubmit={handleSubmit}>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <label className="text-sm text-slate-600">
          Название
          <input
            className="mt-1 h-11 w-full rounded-xl border border-brand-border px-4"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
        </label>
        <label className="text-sm text-slate-600">
          Тип
          <select
            className="mt-1 h-11 w-full rounded-xl border border-brand-border px-4"
            value={form.type}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, type: event.target.value as SkillType }))
            }
          >
            <option value="hard">Hard skill</option>
            <option value="soft">Soft skill</option>
            <option value="product">Product</option>
            <option value="data">Data</option>
          </select>
        </label>
      </form>
    </Modal>
  );
}

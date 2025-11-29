"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/common/Modal";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";

type RequirementInput = {
  id: string;
  skillCode: string;
  levelRequired: number;
  weight: number;
};

type RoleProfileDialogProps = {
  open: boolean;
  initialProfile?: {
    id: string;
    name: string;
    description?: string | null;
    isDefault: boolean;
    requirements: RequirementInput[];
  };
  onClose: () => void;
  onSaved: () => void;
};

export default function RoleProfileDialog({ open, initialProfile, onClose, onSaved }: RoleProfileDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [requirements, setRequirements] = useState<RequirementInput[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialProfile) {
      setName(initialProfile.name);
      setDescription(initialProfile.description ?? "");
      setIsDefault(Boolean(initialProfile.isDefault));
      setRequirements(
        initialProfile.requirements.map((req) => ({
          ...req,
          id: req.id,
        })),
      );
    } else {
      setName("");
      setDescription("");
      setIsDefault(false);
      setRequirements([]);
    }
    setError(null);
  }, [initialProfile, open]);

  const addRequirement = () => {
    setRequirements((prev) => [...prev, { id: makeId(), skillCode: "", levelRequired: 3, weight: 1 }]);
  };

  const removeRequirement = (id: string) => {
    setRequirements((prev) => prev.filter((req) => req.id !== id));
  };

  const updateRequirement = (id: string, patch: Partial<RequirementInput>) => {
    setRequirements((prev) => prev.map((req) => (req.id === id ? { ...req, ...patch } : req)));
  };

  const validate = () => {
    if (!name.trim()) {
      setError("Введите название роли");
      return false;
    }
    for (const req of requirements) {
      if (!req.skillCode.trim()) {
        setError("Укажите skill_code для каждого навыка");
        return false;
      }
      if (req.levelRequired < 1 || req.levelRequired > 5) {
        setError("Уровень навыка должен быть от 1 до 5");
        return false;
      }
      if (req.weight <= 0) {
        setError("Вес навыка должен быть больше 0");
        return false;
      }
    }
    setError(null);
    return true;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const response = await fetch("/api/app/skill-gap/role-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: initialProfile?.id,
          name,
          description,
          isDefault,
          requirements: requirements.map((req) => ({
            skillCode: req.skillCode,
            levelRequired: Number(req.levelRequired),
            weight: Number(req.weight),
          })),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: { message?: string } };
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось сохранить профиль роли");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialProfile ? "Редактировать профиль роли" : "Создать профиль роли"}
      description="Определите ключевые навыки и уровни для роли."
      footer={
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={onClose} className="px-4 py-2">
            Отмена
          </SecondaryButton>
          <PrimaryButton onClick={() => void submit()} disabled={saving} className="px-4 py-2">
            {saving ? "Сохраняем…" : "Сохранить"}
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-3 text-sm text-slate-700">
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-red-700">{error}</p>}
        <label className="grid gap-1">
          <span className="text-xs text-slate-500">Название роли</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-xl border border-brand-border px-3 py-2"
            placeholder="Senior Backend Engineer"
            required
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-slate-500">Описание</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="rounded-xl border border-brand-border px-3 py-2"
            rows={3}
            placeholder="Что ожидается от роли"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />
          Сделать шаблоном роли по умолчанию
        </label>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Требуемые навыки</p>
            <SecondaryButton onClick={addRequirement} className="px-3 py-1 text-xs">
              Добавить навык
            </SecondaryButton>
          </div>
          {requirements.length === 0 && <p className="text-xs text-slate-500">Пока нет ни одного навыка.</p>}
          <div className="space-y-2">
            {requirements.map((req) => (
              <div key={req.id} className="rounded-2xl border border-brand-border/60 bg-white/90 p-3">
                <div className="grid gap-2 md:grid-cols-3">
                  <label className="grid gap-1 text-xs">
                    Skill code
                    <input
                      value={req.skillCode}
                      onChange={(event) => updateRequirement(req.id, { skillCode: event.target.value })}
                      className="rounded-xl border border-brand-border px-3 py-2 text-sm"
                      placeholder="backend.go"
                    />
                  </label>
                  <label className="grid gap-1 text-xs">
                    Требуемый уровень (1-5)
                    <select
                      value={req.levelRequired}
                      onChange={(event) => updateRequirement(req.id, { levelRequired: Number(event.target.value) })}
                      className="rounded-xl border border-brand-border px-3 py-2 text-sm"
                    >
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs">
                    Вес
                    <input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={req.weight}
                      onChange={(event) => updateRequirement(req.id, { weight: Number(event.target.value) })}
                      className="rounded-xl border border-brand-border px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <div className="mt-2 flex justify-end">
                  <SecondaryButton onClick={() => removeRequirement(req.id)} className="px-3 py-1 text-xs">
                    Удалить
                  </SecondaryButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

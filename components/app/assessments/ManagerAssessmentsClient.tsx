"use client";

import { useEffect, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { SkillAssessmentDTO } from "@/services/types/assessment";

type ManagerAssessmentsClientProps = {
  cycleId: string;
};

type ManagerItem = {
  participant: {
    employeeId: string;
    selfStatus: string;
    managerStatus: string;
    finalStatus: string;
    managerEmployeeId: string | null;
  };
  skills: SkillAssessmentDTO[];
};

export default function ManagerAssessmentsClient({ cycleId }: ManagerAssessmentsClientProps) {
  const [items, setItems] = useState<ManagerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/app/assessments/cycles/${cycleId}/manager`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось загрузить участников");
      }
      setItems(payload.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  const updateSkill = async (employeeId: string, skillId: string, managerLevel: number, finalizeSkill: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/app/assessments/cycles/${cycleId}/manager/skills`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, skillId, managerLevel, finalizeSkill }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось обновить оценку");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Менеджер</p>
          <h1 className="text-3xl font-semibold text-brand-text">Калибровка сотрудников</h1>
        </div>
        <SecondaryButton href={`/app/assessments/${cycleId}`} className="px-4 py-2">
          К циклу
        </SecondaryButton>
      </div>

      {error && <Card className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>}
      {loading && items.length === 0 && <p className="text-sm text-slate-500">Загружаем сотрудников…</p>}

      {items.length === 0 ? (
        <Card className="text-sm text-slate-500">У вас пока нет назначенных участников в этом цикле.</Card>
      ) : (
        items.map((item) => (
          <Card key={item.participant.employeeId} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-brand-text">{item.participant.employeeId}</p>
                <p className="text-xs text-slate-500">
                  Самооценка: {item.participant.selfStatus} · Менеджер: {item.participant.managerStatus} · Финал:{" "}
                  {item.participant.finalStatus}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {item.skills.map((skill) => {
                const gap =
                  skill.selfLevel !== null && skill.managerLevel !== null
                    ? (skill.managerLevel ?? 0) - (skill.selfLevel ?? 0)
                    : null;
                return (
                  <div key={skill.id} className="rounded-2xl border border-brand-border/60 bg-white/90 p-3 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-brand-text">{skill.skillId}</p>
                        <p className="text-xs text-slate-500">Статус: {skill.status}</p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                          <Tag variant="outline">Self: {skill.selfLevel ?? "—"}</Tag>
                          <Tag variant="outline">Manager: {skill.managerLevel ?? "—"}</Tag>
                          <Tag variant="outline">Final: {skill.finalLevel ?? "—"}</Tag>
                          {gap !== null && <Tag variant="outline">Gap: {gap}</Tag>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <input
                          type="number"
                          min={1}
                          max={5}
                          defaultValue={skill.managerLevel ?? skill.selfLevel ?? 3}
                          onBlur={(event) =>
                            void updateSkill(item.participant.employeeId, skill.skillId, Number(event.target.value), false)
                          }
                          className="w-20 rounded-xl border border-brand-border px-2 py-1 text-sm"
                        />
                        <PrimaryButton
                          onClick={() =>
                            void updateSkill(item.participant.employeeId, skill.skillId, skill.managerLevel ?? skill.selfLevel ?? 3, true)
                          }
                          className="px-3 py-1 text-xs"
                        >
                          Утвердить
                        </PrimaryButton>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

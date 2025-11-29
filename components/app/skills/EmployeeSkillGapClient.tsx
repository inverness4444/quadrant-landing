"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/common/Card";
import SecondaryButton from "@/components/common/SecondaryButton";
import PrimaryButton from "@/components/common/PrimaryButton";
import Tag from "@/components/common/Tag";

type SkillGapRow = {
  skillId: string;
  skillName?: string | null;
  requiredLevel: number | null;
  currentLevel: number | null;
  gap: number | null;
  importance: number;
};

type GapResponse = {
  ok?: boolean;
  profile?: {
    roleId: string | null;
    roleName?: string | null;
    skills: SkillGapRow[];
  };
  error?: { message?: string };
};

type EmployeeSkillGapClientProps = {
  employeeId: string;
  employeeName: string;
};

export default function EmployeeSkillGapClient({ employeeId, employeeName }: EmployeeSkillGapClientProps) {
  const [skills, setSkills] = useState<SkillGapRow[]>([]);
  const [primaryRole, setPrimaryRole] = useState<string | null>(null);
  const [primaryRoleName, setPrimaryRoleName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadGap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  async function loadGap() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/app/skills-gap/employees/${employeeId}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as GapResponse | null;
      if (!response.ok || !payload?.ok || !payload.profile) {
        throw new Error(payload?.error?.message ?? "Не удалось загрузить gap");
      }
      setSkills(payload.profile.skills);
      setPrimaryRole(payload.profile.roleId);
      setPrimaryRoleName(payload.profile.roleName ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(() => {
    const plus = skills.filter((s) => (s.gap ?? 0) >= 0).length;
    const minus = skills.filter((s) => (s.gap ?? 0) < 0).length;
    const weighted = skills
      .filter((s) => s.gap !== null && s.importance)
      .map((s) => ({ gap: s.gap as number, weight: s.importance }));
    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    const weightedGap = totalWeight > 0 ? weighted.reduce((sum, item) => sum + item.gap * item.weight, 0) / totalWeight : null;
    return { plus, minus, weightedGap };
  }, [skills]);

  const createGoal = async (skillId: string, requiredLevel: number | null) => {
    if (!requiredLevel) return;
    setError(null);
    try {
      const response = await fetch("/api/app/development-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          title: `Развитие навыка ${skillId}`,
          targetSkillCode: skillId,
          targetLevel: requiredLevel,
          source: "skill_gap",
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось создать цель");
      }
      await loadGap();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания цели");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Skill Gap</p>
          <h1 className="text-3xl font-semibold text-brand-text">{employeeName}</h1>
          <p className="text-sm text-slate-600">Основная роль: {primaryRoleName ?? primaryRole ?? "не назначена"}</p>
        </div>
        <SecondaryButton href="/app/skills" className="px-3 py-2 text-xs">
          К списку ролей
        </SecondaryButton>
      </div>

      {error && <Card className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>}

      <Card className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Сводка</p>
        {loading ? (
          <p className="text-sm text-slate-500">Загружаем gap…</p>
        ) : (
          <div className="flex flex-wrap gap-3 text-sm text-slate-700">
            <Tag>Навыков в плюсе: {summary.plus}</Tag>
            <Tag>Навыков в минусе: {summary.minus}</Tag>
            <Tag>Средневзвешенный gap: {summary.weightedGap !== null ? summary.weightedGap.toFixed(2) : "—"}</Tag>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Навыки и gap</p>
            <h2 className="text-xl font-semibold text-brand-text">Навыковая матрица</h2>
          </div>
          <SecondaryButton onClick={() => void loadGap()} className="px-3 py-1 text-xs" disabled={loading}>
            Обновить
          </SecondaryButton>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Загружаем…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Skill</th>
                  <th className="px-3 py-2">Required</th>
                  <th className="px-3 py-2">Actual</th>
                  <th className="px-3 py-2">Gap</th>
                  <th className="px-3 py-2">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {skills.map((row) => (
                  <tr key={row.skillId}>
                    <td className="px-3 py-2 font-semibold text-brand-text">{row.skillName ?? row.skillId}</td>
                    <td className="px-3 py-2 text-slate-600">{row.requiredLevel ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{row.currentLevel ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${gapTone(row.gap)}`}>{row.gap ?? "—"}</span>
                    </td>
                    <td className="px-3 py-2">
                      {row.gap !== null && row.gap < -1 && (
                        <PrimaryButton onClick={() => void createGoal(row.skillId, row.requiredLevel)} className="px-3 py-1 text-xs">
                          Цель развития
                        </PrimaryButton>
                      )}
                    </td>
                  </tr>
                ))}
                {skills.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-sm text-slate-500">
                      Нет данных по навыкам.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function gapTone(gap: number | null) {
  if (gap === null) return "bg-slate-100 text-slate-600";
  if (gap >= 0) return "bg-emerald-50 text-emerald-700";
  if (gap < -1) return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
}

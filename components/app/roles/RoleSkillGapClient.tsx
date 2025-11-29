"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/common/Card";

type GapResponse = {
  ok: boolean;
  employees: Array<{
    employeeId: string;
    employeeName?: string;
    roleId: string;
    skillId: string;
    skillName?: string;
    requiredLevel: number;
    currentLevel: number | null;
    gap: number | null;
    importance: number;
  }>;
  top: Array<{ skillId: string; skillName?: string; avgGap: number; importance: number; affectedEmployees: number }>;
  skills: Array<{ id: string; name: string }>;
  employeesList?: Array<{ id: string; name: string }>;
};

export default function RoleSkillGapClient({ roleId, roleName }: { roleId: string; roleName: string }) {
  const [data, setData] = useState<GapResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetch(`/api/app/skills-gap/roles/${roleId}`, { cache: "no-store" });
        const json = await resp.json().catch(() => null);
        if (!resp.ok || !json?.ok) throw new Error(json?.error?.message ?? "Не удалось загрузить skill gap");
        setData(json as GapResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка");
      }
    };
    void load();
  }, [roleId]);

  const skills = useMemo(() => data?.skills ?? [], [data]);
  const employees = useMemo(() => {
    if (!data) return [];
    const list = data.employeesList ?? [];
    if (list.length) return list.map((e) => ({ id: e.id, name: e.name }));
    const uniqueIds = Array.from(new Set(data.employees.map((e) => e.employeeId)));
    return uniqueIds.map((id) => ({ id, name: data.employees.find((e) => e.employeeId === id)?.employeeName ?? id }));
  }, [data]);

  if (error) return <Card className="p-3 text-sm text-red-600">{error}</Card>;
  if (!data) return <Card className="p-3 text-sm text-slate-500">Загрузка skill gap…</Card>;

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Skill Gap</p>
          <h2 className="text-xl font-semibold text-brand-text">Роль: {roleName}</h2>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-brand-text">Топ проблемных навыков</p>
          {data.top.length === 0 && <p className="text-sm text-slate-500">Нет данных</p>}
          {data.top.map((item) => {
            const skillName = item.skillName ?? item.skillId;
            return (
              <Card key={item.skillId} className="border border-white/60 bg-white/90 p-3 text-sm text-slate-700">
                <p className="font-semibold text-brand-text">{skillName}</p>
                <p className="text-xs text-slate-500">
                  Средний gap: {item.avgGap.toFixed(2)} · Важность: {item.importance} · Людей затронуто: {item.affectedEmployees}
                </p>
              </Card>
            );
          })}
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Матрица навыков</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Сотрудник</th>
                {skills.map((s) => (
                  <th key={s.id} className="px-3 py-2">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td className="px-3 py-2 font-semibold text-brand-text">{emp.name}</td>
                  {skills.map((s) => {
                    const row = data.employees.find((e) => e.employeeId === emp.id && e.skillId === s.id);
                    const gap = row?.gap ?? null;
                    const tone =
                      gap === null
                        ? "bg-slate-100 text-slate-500"
                        : gap >= 0
                          ? "bg-emerald-50 text-emerald-700"
                          : gap < -1
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700";
                    return (
                      <td key={s.id} className="px-3 py-2 text-xs">
                        <span className={`rounded-full px-2 py-1 ${tone}`}>
                          {row?.currentLevel ?? "–"}/{row?.requiredLevel ?? "–"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-sm text-slate-500" colSpan={skills.length + 1}>
                    Сотрудников для этой роли не найдено.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

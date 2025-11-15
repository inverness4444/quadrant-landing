"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import Tag from "@/components/common/Tag";
import SkillFormModal from "@/components/app/skills/SkillFormModal";
import type { Employee, EmployeeSkill, Skill } from "@/drizzle/schema";

type SkillStat = {
  skill: Skill;
  count: number;
  average: number;
  employees: Array<{ employee: Employee; level: number }>;
};

type SkillsClientProps = {
  skills: Skill[];
  employeeSkills: EmployeeSkill[];
  employees: Employee[];
};

export default function SkillsClient({ skills, employeeSkills, employees }: SkillsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [currentSkill, setCurrentSkill] = useState<Skill | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  const stats = useMemo<SkillStat[]>(() => {
    const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));
    return skills.map((skill) => {
      const assignments = employeeSkills.filter((entry) => entry.skillId === skill.id);
      const employeesWithSkill = assignments
        .map((entry) => {
          const employee = employeeMap.get(entry.employeeId);
          if (!employee) return null;
          return { employee, level: entry.level };
        })
        .filter(Boolean) as Array<{ employee: Employee; level: number }>;
      const average =
        employeesWithSkill.length === 0
          ? 0
          : Math.round(
              (employeesWithSkill.reduce((sum, entry) => sum + entry.level, 0) /
                employeesWithSkill.length) *
                10,
            ) / 10;
      return {
        skill,
        count: employeesWithSkill.length,
        average,
        employees: employeesWithSkill,
      };
    });
  }, [skills, employeeSkills, employees]);

  const filteredStats = stats.filter((entry) => {
    const matchesSearch = entry.skill.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || entry.skill.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const selectedStat = filteredStats.find((entry) => entry.skill.id === currentSkill?.id);

  const topSkills = [...stats]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .filter((entry) => entry.count > 0);

  const openCreateModal = () => {
    setModalMode("create");
    setCurrentSkill(null);
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (skill: Skill) => {
    setModalMode("edit");
    setCurrentSkill(skill);
    setModalError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalError(null);
  };

  const handleSubmit = async (values: { name: string; type: Skill["type"] }) => {
    setSaving(true);
    setModalError(null);
    const endpoint =
      modalMode === "edit" && currentSkill
        ? `/api/app/skills/${currentSkill.id}`
        : "/api/app/skills";
    const method = modalMode === "edit" ? "PUT" : "POST";
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSaving(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setModalError(data.message || "Не удалось сохранить навык");
      return;
    }
    closeModal();
    startTransition(() => router.refresh());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-text">Навыки</h1>
          <p className="text-sm text-slate-600">База навыков вашей команды</p>
        </div>
        <PrimaryButton onClick={openCreateModal} className="px-4 py-2">
          Добавить навык
        </PrimaryButton>
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="h-11 rounded-xl border border-brand-border px-4"
              placeholder="Поиск..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="h-11 rounded-xl border border-brand-border px-4"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="all">Все типы</option>
              <option value="hard">Hard</option>
              <option value="soft">Soft</option>
              <option value="product">Product</option>
              <option value="data">Data</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Навык</th>
                  <th className="px-3 py-2">Тип</th>
                  <th className="px-3 py-2">Сотрудники</th>
                  <th className="px-3 py-2">Средний уровень</th>
                  <th className="px-3 py-2 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {filteredStats.map((entry) => (
                  <tr
                    key={entry.skill.id}
                    className={`cursor-pointer transition hover:bg-brand-muted/60 ${
                      currentSkill?.id === entry.skill.id ? "bg-brand-muted" : ""
                    }`}
                    onClick={() => setCurrentSkill(entry.skill)}
                  >
                    <td className="px-3 py-3 font-semibold text-brand-text">{entry.skill.name}</td>
                    <td className="px-3 py-3 text-slate-600">{formatSkillType(entry.skill.type)}</td>
                    <td className="px-3 py-3">{entry.count}</td>
                    <td className="px-3 py-3">{entry.average || "—"}</td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        className="text-xs font-semibold text-brand-link"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditModal(entry.skill);
                        }}
                      >
                        Изменить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredStats.length === 0 && (
              <div className="py-10 text-center text-sm text-slate-500">
                Навыки не найдены. Добавьте первый навык.
              </div>
            )}
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <p className="text-sm font-semibold text-slate-600">Топ навыков</p>
            <div className="mt-4 space-y-3">
              {topSkills.length === 0 && (
                <p className="text-sm text-slate-500">Пока нет данных, добавьте сотрудников.</p>
              )}
              {topSkills.map((entry) => (
                <div key={entry.skill.id}>
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>{entry.skill.name}</span>
                    <span>{entry.count}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-brand-muted">
                    <div
                      className="h-full rounded-full bg-brand-primary"
                      style={{ width: `${Math.min(100, entry.count * 15)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <p className="text-sm font-semibold text-slate-600">Сотрудники</p>
            {selectedStat ? (
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {selectedStat.employees.map((entry) => (
                  <div
                    key={entry.employee.id}
                    className="flex items-center justify-between rounded-xl bg-brand-muted px-3 py-2"
                  >
                    <div>
                      <p className="font-semibold text-brand-text">{entry.employee.name}</p>
                      <p className="text-xs text-slate-500">{entry.employee.position}</p>
                    </div>
                    <Tag>{entry.level}/5</Tag>
                  </div>
                ))}
                {selectedStat.employees.length === 0 && (
                  <p className="text-sm text-slate-500">Ни один сотрудник пока не отметил этот навык</p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Выберите навык, чтобы увидеть сотрудников</p>
            )}
          </Card>
        </div>
      </div>
      <SkillFormModal
        open={modalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        saving={saving || isPending}
        initialValues={
          modalMode === "edit" && currentSkill
            ? { name: currentSkill.name, type: currentSkill.type }
            : undefined
        }
        error={modalError}
      />
    </div>
  );
}

function formatSkillType(type: Skill["type"]) {
  switch (type) {
    case "hard":
      return "Hard";
    case "soft":
      return "Soft";
    case "product":
      return "Product";
    case "data":
      return "Data";
    default:
      return type;
  }
}

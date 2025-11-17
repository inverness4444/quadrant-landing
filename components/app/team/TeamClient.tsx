"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import EmployeeDetails from "@/components/app/team/EmployeeDetails";
import EmployeeFormModal, { type EmployeeFormValues } from "@/components/app/team/EmployeeFormModal";
import type { Employee, EmployeeSkill, Skill, Track, TrackLevel } from "@/drizzle/schema";
import { buildCsrfHeader } from "@/lib/csrf";

type EnrichedEmployee = Employee & {
  skillDetails: Array<{ skill: Skill; level: number }>;
  track?: Track | null;
  trackLevel?: TrackLevel | null;
};

type TeamClientProps = {
  skills: Skill[];
  tracks: Track[];
  trackLevels: TrackLevel[];
  initialEmployees: Employee[];
  initialEmployeeSkills: EmployeeSkill[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  positions: string[];
};

export default function TeamClient({
  skills,
  tracks,
  trackLevels,
  initialEmployees,
  initialEmployeeSkills,
  pagination,
  positions,
}: TeamClientProps) {
  const router = useRouter();
  const [employeesState, setEmployeesState] = useState(initialEmployees);
  const [employeeSkillsState, setEmployeeSkillsState] = useState(initialEmployeeSkills);
  const [paginationState, setPaginationState] = useState(pagination);
  const [filters, setFilters] = useState<{ search: string; level: string; position: string }>({
    search: "",
    level: "all",
    position: "all",
  });
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialEmployees[0]?.id ?? null);
  const [modalState, setModalState] = useState<{ mode: "create" | "edit"; employee?: EnrichedEmployee }>({
    mode: "create",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  const fetchEmployees = async (page = 1, nextFilters = filters) => {
    setListLoading(true);
    setListError(null);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(paginationState.pageSize),
    });
    if (nextFilters.search) params.set("search", nextFilters.search);
    if (nextFilters.level && nextFilters.level !== "all") params.set("level", nextFilters.level);
    if (nextFilters.position && nextFilters.position !== "all") params.set("position", nextFilters.position);
    try {
      const response = await fetch(`/api/app/employees?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Не удалось загрузить сотрудников");
      }
      const data = await response.json();
      setEmployeesState(data.employees);
      setEmployeeSkillsState(data.employeeSkills);
      setPaginationState({ page: data.page, pageSize: data.pageSize, total: data.total });
    } catch (error) {
      setListError((error as Error).message);
    } finally {
      setListLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    const next = { ...filters, search: value };
    setFilters(next);
    void fetchEmployees(1, next);
  };

  const handleLevelChange = (value: string) => {
    const next = { ...filters, level: value };
    setFilters(next);
    void fetchEmployees(1, next);
  };

  const handlePositionChange = (value: string) => {
    const next = { ...filters, position: value };
    setFilters(next);
    void fetchEmployees(1, next);
  };

const skillMap = useMemo(() => new Map(skills.map((skill) => [skill.id, skill])), [skills]);

type ApiErrorPayload = {
  error?: { code?: string; message?: string };
  message?: string;
};

const formatApiError = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object") {
    const data = payload as ApiErrorPayload;
    if (data.error?.code === "PLAN_LIMIT_REACHED" && data.error.message) {
      return `${data.error.message} Откройте вкладку «Тариф и биллинг», чтобы узнать детали.`;
    }
    return data.error?.message || data.message || fallback;
  }
  return fallback;
};

  const enrichedEmployees = useMemo<EnrichedEmployee[]>(() => {
    const groupedSkills = new Map<string, EmployeeSkill[]>();
    for (const entry of employeeSkillsState) {
      if (!groupedSkills.has(entry.employeeId)) {
        groupedSkills.set(entry.employeeId, []);
      }
      groupedSkills.get(entry.employeeId)?.push(entry);
    }
    const trackMap = new Map(tracks.map((track) => [track.id, track]));
    const trackLevelMap = new Map(trackLevels.map((level) => [level.id, level]));
    return employeesState
      .map((employee) => {
        const entries = groupedSkills.get(employee.id) ?? [];
        const skillDetails = entries
          .map((entry) => {
            const skill = skillMap.get(entry.skillId);
            if (!skill) return null;
            return { skill, level: entry.level };
          })
          .filter(Boolean) as Array<{ skill: Skill; level: number }>;
        const track = employee.primaryTrackId ? trackMap.get(employee.primaryTrackId) ?? null : null;
        const trackLevel = employee.trackLevelId ? trackLevelMap.get(employee.trackLevelId) ?? null : null;
        return { ...employee, skillDetails, track, trackLevel };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [employeesState, skillMap, employeeSkillsState, tracks, trackLevels]);

  const filteredEmployees = enrichedEmployees;

  const selectedEmployee = enrichedEmployees.find((employee) => employee.id === selectedId);
  const totalPages = Math.max(1, Math.ceil(paginationState.total / paginationState.pageSize));
  const canPrev = paginationState.page > 1;
  const canNext = paginationState.page < totalPages;

  useEffect(() => {
    if (selectedId && enrichedEmployees.some((employee) => employee.id === selectedId)) {
      return;
    }
    if (enrichedEmployees.length > 0) {
      setSelectedId(enrichedEmployees[0].id);
    } else {
      setSelectedId(null);
    }
  }, [enrichedEmployees, selectedId]);

  const openCreateModal = () => {
    setModalState({ mode: "create" });
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (employee: EnrichedEmployee) => {
    setModalState({ mode: "edit", employee });
    setModalError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalError(null);
  };

  const buildFormValues = (employee?: EnrichedEmployee): EmployeeFormValues | undefined => {
    if (!employee) return undefined;
    return {
      name: employee.name,
      position: employee.position,
      level: employee.level,
      primaryTrackId: employee.primaryTrackId ?? null,
      trackLevelId: employee.trackLevelId ?? null,
      skills: employee.skillDetails.map((entry) => ({
        skillId: entry.skill.id,
        level: entry.level,
      })),
    };
  };

  const handleSubmit = async (values: EmployeeFormValues) => {
    setSaving(true);
    setModalError(null);
    const endpoint =
      modalState.mode === "edit"
        ? `/api/app/employees/${modalState.employee?.id}`
        : "/api/app/employees";
    const method = modalState.mode === "edit" ? "PUT" : "POST";
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json", ...buildCsrfHeader() },
      body: JSON.stringify(values),
    });
    setSaving(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setModalError(formatApiError(data, "Не удалось сохранить сотрудника"));
      return;
    }
    closeModal();
    startTransition(() => router.refresh());
  };

  const handleDelete = async (employee: EnrichedEmployee) => {
    if (!confirm(`Удалить ${employee.name}?`)) return;
    const response = await fetch(`/api/app/employees/${employee.id}`, {
      method: "DELETE",
      headers: buildCsrfHeader(),
    });
    if (!response.ok) {
      alert("Не удалось удалить сотрудника");
      return;
    }
    if (selectedId === employee.id) {
      setSelectedId(null);
    }
    startTransition(() => router.refresh());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-text">Команда</h1>
          <p className="text-sm text-slate-600">Следите за навыками и прогрессом сотрудников</p>
        </div>
        <PrimaryButton onClick={openCreateModal} className="px-4 py-2">
          Добавить сотрудника
        </PrimaryButton>
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="h-11 rounded-xl border border-brand-border px-4"
              placeholder="Поиск по имени или позиции..."
              value={filters.search}
              onChange={(event) => handleSearchChange(event.target.value)}
            />
            <select
              className="h-11 rounded-xl border border-brand-border px-4"
              value={filters.level}
              onChange={(event) => handleLevelChange(event.target.value)}
            >
              <option value="all">Все уровни</option>
              <option value="Junior">Junior</option>
              <option value="Middle">Middle</option>
              <option value="Senior">Senior</option>
            </select>
            <select
              className="h-11 rounded-xl border border-brand-border px-4"
              value={filters.position}
              onChange={(event) => handlePositionChange(event.target.value)}
            >
              <option value="all">Все позиции</option>
              {positions.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            {filteredEmployees.length === 0 && !listLoading ? (
              <div className="rounded-2xl border border-dashed border-brand-border p-8 text-center">
                <p className="text-sm text-slate-600">Пока нет сотрудников. Добавьте первого, чтобы построить карту навыков.</p>
                <PrimaryButton
                  type="button"
                  onClick={openCreateModal}
                  className="mt-4 px-4 py-2"
                >
                  Добавить сотрудника
                </PrimaryButton>
              </div>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Имя</th>
                    <th className="px-3 py-2">Позиция</th>
                    <th className="px-3 py-2">Уровень</th>
                    <th className="px-3 py-2">Навыки</th>
                    <th className="px-3 py-2 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {filteredEmployees.map((employee) => (
                    <tr
                      key={employee.id}
                      className={`cursor-pointer transition hover:bg-brand-muted/60 ${
                        selectedId === employee.id ? "bg-brand-muted" : ""
                      }`}
                      onClick={() => setSelectedId(employee.id)}
                    >
                      <td className="px-3 py-3">
                        <div className="font-semibold text-brand-text">{employee.name}</div>
                        <p className="text-xs text-slate-500">
                          {employee.track?.name || "Без трека"}
                          {employee.trackLevel ? ` · ${employee.trackLevel.name}` : ""}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{employee.position}</td>
                      <td className="px-3 py-3">
                        <Tag>{employee.level}</Tag>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          {employee.skillDetails.slice(0, 4).map((entry) => (
                            <Tag key={entry.skill.id}>
                              {entry.skill.name} · {entry.level}/5
                            </Tag>
                          ))}
                          {employee.skillDetails.length === 0 && (
                            <span className="text-xs text-slate-500">Навыки не указаны</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <SecondaryButton
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditModal(employee);
                            }}
                            className="px-3 py-1 text-xs"
                          >
                            Редактировать
                          </SecondaryButton>
                          <button
                            type="button"
                            className="text-xs font-semibold text-red-500"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDelete(employee);
                            }}
                          >
                            Удалить
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {listError && <p className="text-sm text-red-500">{listError}</p>}
          {listLoading && <p className="text-sm text-slate-500">Загружаем сотрудников...</p>}
          <div className="flex flex-col gap-2 border-t border-brand-border pt-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Показано {filteredEmployees.length} из {paginationState.total} сотрудников
            </p>
            <div className="flex items-center gap-2">
              <PrimaryButton
                type="button"
                variant="secondary"
                disabled={!canPrev || listLoading}
                onClick={() => fetchEmployees(paginationState.page - 1)}
                className="px-3 py-1"
              >
                Назад
              </PrimaryButton>
              <span>
                Страница {paginationState.page} / {totalPages}
              </span>
              <PrimaryButton
                type="button"
                variant="secondary"
                disabled={!canNext || listLoading}
                onClick={() => fetchEmployees(paginationState.page + 1)}
                className="px-3 py-1"
              >
                Вперёд
              </PrimaryButton>
            </div>
          </div>
        </Card>
        <div className="space-y-4">
          <EmployeeDetails
            employee={selectedEmployee}
            skills={selectedEmployee?.skillDetails ?? []}
            track={selectedEmployee?.track}
            trackLevel={selectedEmployee?.trackLevel ?? null}
            allSkills={skills}
          />
        </div>
      </div>
      <EmployeeFormModal
        open={modalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        saving={saving || isPending}
        skills={skills}
        tracks={tracks}
        trackLevels={trackLevels}
        initialValues={buildFormValues(modalState.employee)}
        error={modalError}
      />
    </div>
  );
}

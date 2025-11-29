"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import SkillFormModal from "@/components/app/skills/SkillFormModal";
import type { Artifact, ArtifactSkill, Employee, EmployeeSkill, Skill } from "@/drizzle/schema";
import { buildCsrfHeader } from "@/lib/csrf";

type SkillStat = {
  skill: Skill;
  count: number;
  average: number;
  employees: Array<{ employee: Employee; level: number }>;
};

type SkillArtifactsState = {
  artifacts: Artifact[];
  artifactSkills: ArtifactSkill[];
  employees: Employee[];
  page: number;
  pageSize: number;
  total: number;
};

type ApiErrorPayload = {
  error?: { message?: string };
  message?: string;
};

const formatApiError = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object") {
    const data = payload as ApiErrorPayload;
    return data.error?.message || data.message || fallback;
  }
  return fallback;
};

type SkillsClientProps = {
  initialSkills: Skill[];
  initialEmployeeSkills: EmployeeSkill[];
  initialEmployees: Employee[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  openCreateModalOnMount?: boolean;
};

export default function SkillsClient({
  initialSkills,
  initialEmployeeSkills,
  initialEmployees,
  pagination,
  openCreateModalOnMount = false,
}: SkillsClientProps) {
  const router = useRouter();
  const [skillsState, setSkillsState] = useState(initialSkills);
  const [employeeSkillsState, setEmployeeSkillsState] = useState(initialEmployeeSkills);
  const [employeesState, setEmployeesState] = useState(initialEmployees);
  const [paginationState, setPaginationState] = useState(pagination);
  const [filters, setFilters] = useState<{ search: string; type: string }>({
    search: "",
    type: "all",
  });
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [currentSkill, setCurrentSkill] = useState<Skill | null>(initialSkills[0] ?? null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [skillArtifactsState, setSkillArtifactsState] = useState<SkillArtifactsState>({
    artifacts: [],
    artifactSkills: [],
    employees: [],
    page: 1,
    pageSize: 5,
    total: 0,
  });
  const [skillArtifactsLoading, setSkillArtifactsLoading] = useState(false);
  const [skillArtifactsError, setSkillArtifactsError] = useState<string | null>(null);

  const fetchSkills = async (page = 1, nextFilters = filters) => {
    setListLoading(true);
    setListError(null);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(paginationState.pageSize),
    });
    if (nextFilters.search) params.set("search", nextFilters.search);
    if (nextFilters.type && nextFilters.type !== "all") params.set("type", nextFilters.type);
    try {
      const response = await fetch(`/api/app/skills?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Не удалось загрузить навыки");
      }
      const data = await response.json();
      setSkillsState(data.skills);
      setEmployeeSkillsState(data.employeeSkills);
      setEmployeesState(data.employees);
      setPaginationState({ page: data.page, pageSize: data.pageSize, total: data.total });
    } catch (error) {
      setListError((error as Error).message);
    } finally {
      setListLoading(false);
    }
  };

  const fetchSkillArtifacts = async (page = 1, skillId?: string) => {
    const targetSkillId = skillId ?? currentSkill?.id;
    if (!targetSkillId) return;
    const currentPageSize = skillArtifactsState.pageSize || 5;
    setSkillArtifactsLoading(true);
    setSkillArtifactsError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(currentPageSize),
      });
      const response = await fetch(`/api/app/skills/${targetSkillId}/artifacts?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || "Не удалось загрузить артефакты навыка");
      }
      setSkillArtifactsState({
        artifacts: data.artifacts ?? [],
        artifactSkills: data.artifactSkills ?? [],
        employees: data.employees ?? [],
        page: data.page ?? page,
        pageSize: data.pageSize ?? currentPageSize,
        total: data.total ?? 0,
      });
    } catch (error) {
      setSkillArtifactsError((error as Error).message);
    } finally {
      setSkillArtifactsLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    const next = { ...filters, search: value };
    setFilters(next);
    void fetchSkills(1, next);
  };

  const handleTypeChange = (value: string) => {
    const next = { ...filters, type: value };
    setFilters(next);
    void fetchSkills(1, next);
  };

  useEffect(() => {
    if (!currentSkill) {
      setSkillArtifactsState({ artifacts: [], artifactSkills: [], employees: [], page: 1, pageSize: 5, total: 0 });
      setSkillArtifactsError(null);
      return;
    }
    void fetchSkillArtifacts(1, currentSkill.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSkill?.id]);

  const employeeMap = useMemo(() => new Map(employeesState.map((employee) => [employee.id, employee])), [employeesState]);

  const detailEmployeeMap = useMemo(() => {
    const map = new Map(employeeMap);
    for (const employee of skillArtifactsState.employees) {
      map.set(employee.id, employee);
    }
    return map;
  }, [employeeMap, skillArtifactsState.employees]);

  const stats = useMemo<SkillStat[]>((() => {
    return skillsState.map((skill) => {
      const assignments = employeeSkillsState.filter((entry) => entry.skillId === skill.id);
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
  }), [skillsState, employeeSkillsState, employeeMap]);

  const filteredStats = stats;

  const selectedStat = filteredStats.find((entry) => entry.skill.id === currentSkill?.id);
  const selectedArtifacts = useMemo(() => {
    if (!currentSkill) return [];
    const confidenceMap = new Map(
      skillArtifactsState.artifactSkills.map((entry) => [entry.artifactId, entry.confidence]),
    );
    return skillArtifactsState.artifacts.map((artifact) => ({
      artifact,
      employee: detailEmployeeMap.get(artifact.employeeId),
      confidence: confidenceMap.get(artifact.id) ?? null,
    }));
  }, [currentSkill, detailEmployeeMap, skillArtifactsState.artifacts, skillArtifactsState.artifactSkills]);

  const artifactTotalPages = Math.max(1, Math.ceil((skillArtifactsState.total || 0) / (skillArtifactsState.pageSize || 5)));
  const artifactCanPrev = skillArtifactsState.page > 1;
  const artifactCanNext = skillArtifactsState.page < artifactTotalPages;

  useEffect(() => {
    if (currentSkill && skillsState.some((skill) => skill.id === currentSkill.id)) {
      return;
    }
    setCurrentSkill(skillsState[0] ?? null);
  }, [skillsState, currentSkill]);

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

  useEffect(() => {
    if (openCreateModalOnMount) {
      setModalMode("create");
      setModalError(null);
      setModalOpen(true);
    }
  }, [openCreateModalOnMount]);

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
      headers: { "Content-Type": "application/json", ...buildCsrfHeader() },
      body: JSON.stringify(values),
    });
    setSaving(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setModalError(formatApiError(data, "Не удалось сохранить навык"));
      return;
    }
    closeModal();
    startTransition(() => router.refresh());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-text">Навыки и артефакты</h1>
          <p className="text-sm text-slate-600">
            Здесь Quadrant показывает навыки, подтверждённые артефактами команды. Видно, где компетенции сильны,
            а где стоит усилить экспертизу или добавить материалы.
          </p>
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
              placeholder="Поиск по названию навыка"
              value={filters.search}
              onChange={(event) => handleSearchChange(event.target.value)}
            />
            <select
              className="h-11 rounded-xl border border-brand-border px-4"
              value={filters.type}
              onChange={(event) => handleTypeChange(event.target.value)}
            >
              <option value="all">Все типы</option>
              <option value="hard">Хард</option>
              <option value="soft">Софт</option>
              <option value="product">Продуктовые</option>
              <option value="data">Data/ML</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            {filteredStats.length === 0 && !listLoading ? (
              <div className="rounded-3xl border border-dashed border-white/60 bg-white/80 p-8 text-center">
                <p className="text-lg font-semibold text-brand-text">Пока нет навыков</p>
                <p className="mt-2 text-sm text-slate-600">Создайте ключевые навыки вашей команды.</p>
                <PrimaryButton onClick={openCreateModal} className="mt-4 px-4 py-2">
                  Создать навык
                </PrimaryButton>
              </div>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Навык</th>
                    <th className="px-3 py-2">Сотрудники</th>
                    <th className="px-3 py-2">Средний уровень</th>
                    <th className="px-3 py-2">Состояние</th>
                    <th className="px-3 py-2 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {filteredStats.map((entry) => {
                    const skillState = resolveSkillState(entry);
                    return (
                      <tr
                        key={entry.skill.id}
                        className={`cursor-pointer transition hover:bg-brand-muted/60 ${
                          currentSkill?.id === entry.skill.id ? "bg-brand-muted" : ""
                        }`}
                        onClick={() => setCurrentSkill(entry.skill)}
                      >
                        <td className="px-3 py-3">
                          <p className="font-semibold text-brand-text">{entry.skill.name}</p>
                          <p className="text-xs text-slate-500">{formatSkillType(entry.skill.type)}</p>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{entry.count || 0} чел.</td>
                        <td className="px-3 py-3">
                          {entry.average ? `${entry.average}/5` : "Нет данных"}
                        </td>
                        <td className="px-3 py-3">
                          <SkillStateBadge state={skillState.label} tone={skillState.tone} />
                        </td>
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
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {listError && <p className="text-sm text-red-500">{listError}</p>}
          {listLoading && <p className="text-sm text-slate-500">Загружаем навыки...</p>}
          <div className="flex flex-col gap-2 border-t border-brand-border pt-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Показано {filteredStats.length} из {paginationState.total} навыков
            </p>
            <div className="flex items-center gap-2">
              <SecondaryButton
                type="button"
                disabled={paginationState.page === 1 || listLoading}
                onClick={() => fetchSkills(paginationState.page - 1)}
                className="px-3 py-1"
              >
                Назад
              </SecondaryButton>
              <span>
                Страница {paginationState.page} / {Math.max(1, Math.ceil(paginationState.total / paginationState.pageSize))}
              </span>
              <SecondaryButton
                type="button"
                disabled={
                  paginationState.page >= Math.ceil(paginationState.total / paginationState.pageSize) || listLoading
                }
                onClick={() => fetchSkills(paginationState.page + 1)}
                className="px-3 py-1"
              >
                Вперёд
              </SecondaryButton>
            </div>
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
          <Card>
            <p className="text-sm font-semibold text-slate-600">Артефакты</p>
            {currentSkill ? (
              <>
                {skillArtifactsError && <p className="mt-2 text-sm text-red-500">{skillArtifactsError}</p>}
                {skillArtifactsLoading && <p className="mt-2 text-sm text-slate-500">Загружаем артефакты…</p>}
                {selectedArtifacts.length > 0 ? (
                  <div className="mt-3 space-y-3 text-sm text-slate-600">
                    {selectedArtifacts.map((entry) => (
                      <div key={entry.artifact.id} className="rounded-2xl bg-brand-muted/40 px-3 py-2">
                        <p className="font-semibold text-brand-text">{entry.artifact.title}</p>
                        <p className="text-xs text-slate-500">
                          {entry.artifact.type} · {entry.employee?.name ?? "Сотрудник неизвестен"}
                        </p>
                        {typeof entry.confidence === "number" && (
                          <p className="text-xs text-slate-500">
                            Вклад: {Math.round(entry.confidence * 100)}%
                          </p>
                        )}
                        <p className="mt-1 text-xs text-slate-500">{entry.artifact.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  !skillArtifactsLoading && !skillArtifactsError && (
                    <p className="mt-2 text-sm text-slate-500">Для этого навыка пока нет артефактов</p>
                  )
                )}
                {selectedArtifacts.length > 0 && (
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Страница {skillArtifactsState.page} / {artifactTotalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fetchSkillArtifacts(skillArtifactsState.page - 1, currentSkill.id)}
                        disabled={!artifactCanPrev || skillArtifactsLoading}
                        className="rounded-xl border border-brand-border px-3 py-1 disabled:opacity-50"
                      >
                        Назад
                      </button>
                      <button
                        type="button"
                        onClick={() => fetchSkillArtifacts(skillArtifactsState.page + 1, currentSkill.id)}
                        disabled={!artifactCanNext || skillArtifactsLoading}
                        className="rounded-xl border border-brand-border px-3 py-1 disabled:opacity-50"
                      >
                        Вперёд
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Выберите навык, чтобы увидеть артефакты</p>
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
      return "Хард";
    case "soft":
      return "Софт";
    case "product":
      return "Продуктовые";
    case "data":
      return "Data/ML";
    default:
      return "Другое";
  }
}

type SkillStateTone = "ok" | "risk" | "growth" | "muted";

function resolveSkillState(stat: SkillStat): { label: string; tone: SkillStateTone } {
  if (!stat.count) {
    return { label: "Нет данных", tone: "muted" };
  }
  if (stat.average < 3) {
    return { label: "Риск", tone: "risk" };
  }
  if (stat.average < 4) {
    return { label: "Точка роста", tone: "growth" };
  }
  return { label: "OK", tone: "ok" };
}

function SkillStateBadge({ state, tone }: { state: string; tone: SkillStateTone }) {
  const toneClasses: Record<SkillStateTone, string> = {
    ok: "bg-emerald-50 text-emerald-700",
    risk: "bg-red-50 text-red-600",
    growth: "bg-amber-50 text-amber-600",
    muted: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
      {state}
    </span>
  );
}

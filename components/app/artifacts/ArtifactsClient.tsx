"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "@/components/common/Card";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { ArtifactWithAssigneesAndSkills } from "@/services/types/artifact";

type IntegrationOption = {
  id: string;
  name: string;
  type: string;
};

type EmployeeOption = {
  id: string;
  name: string;
  position: string;
};

const artifactTypeOptions = [
  { value: "all", label: "Все типы" },
  { value: "pull_request", label: "Pull Request" },
  { value: "task", label: "Задача" },
  { value: "ticket", label: "Ticket" },
  { value: "doc", label: "Документ" },
];

const badgeColors: Record<string, string> = {
  pull_request: "bg-emerald-100 text-emerald-800",
  task: "bg-blue-100 text-blue-800",
  ticket: "bg-indigo-100 text-indigo-800",
  doc: "bg-amber-100 text-amber-800",
  default: "bg-slate-100 text-slate-600",
};

export default function ArtifactsClient() {
  const [artifacts, setArtifacts] = useState<ArtifactWithAssigneesAndSkills[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [integrationOptions, setIntegrationOptions] = useState<IntegrationOption[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const [filters, setFilters] = useState({
    type: "all",
    integrationId: "all",
    employeeId: "all",
  });

  const loadMetadata = useCallback(async () => {
    try {
      const [integrationResponse, employeesResponse] = await Promise.all([
        fetch("/api/app/integrations", { cache: "no-store" }),
        fetch("/api/app/employees?page=1&pageSize=100", { cache: "no-store" }),
      ]);
      if (integrationResponse.ok) {
        const data = (await integrationResponse.json()) as { integrations: IntegrationOption[] };
        setIntegrationOptions(data.integrations ?? []);
      }
      if (employeesResponse.ok) {
        const data = (await employeesResponse.json()) as { employees: EmployeeOption[] };
        setEmployeeOptions(data.employees ?? []);
      }
    } catch {
      // ignore metadata errors
    }
  }, []);

  const loadArtifacts = useCallback(
    async (override?: Partial<typeof filters>) => {
      setLoading(true);
      setError(null);
      try {
        const applied = { ...filters, ...override };
        const params = new URLSearchParams();
        if (applied.type !== "all") params.set("type", applied.type);
        if (applied.integrationId !== "all") params.set("integrationId", applied.integrationId);
        if (applied.employeeId !== "all") params.set("employeeId", applied.employeeId);
        params.set("limit", "40");
        const response = await fetch(`/api/app/artifacts?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Не удалось загрузить артефакты");
        }
        const payload = (await response.json()) as { artifacts: ArtifactWithAssigneesAndSkills[] };
        setArtifacts(payload.artifacts ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Неизвестная ошибка");
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    void loadMetadata();
    void loadArtifacts();
  }, [loadArtifacts, loadMetadata]);

  const handleApplyFilters = async () => {
    await loadArtifacts();
  };

  const handleResetFilters = () => {
    setFilters({ type: "all", integrationId: "all", employeeId: "all" });
    void loadArtifacts({ type: "all", integrationId: "all", employeeId: "all" });
  };

  const integrationFilterOptions = useMemo(
    () => [{ id: "all", name: "Все интеграции", type: "" }, ...integrationOptions],
    [integrationOptions],
  );
  const employeeFilterOptions = useMemo(
    () => [{ id: "all", name: "Все сотрудники", position: "" }, ...employeeOptions],
    [employeeOptions],
  );

  const renderArtifacts = () => {
    if (loading) {
      return <Card className="text-sm text-slate-500">Загружаем артефакты...</Card>;
    }
    if (artifacts.length === 0) {
      return <Card className="text-sm text-slate-500">Пока нет артефактов под выбранные фильтры.</Card>;
    }
    return (
      <div className="overflow-x-auto rounded-2xl border border-brand-border/70">
        <table className="min-w-full divide-y divide-brand-border text-sm">
          <thead className="bg-brand-muted/60 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Артефакт</th>
              <th className="px-4 py-3 text-left">Тип</th>
              <th className="px-4 py-3 text-left">Интеграция</th>
              <th className="px-4 py-3 text-left">Сотрудники</th>
              <th className="px-4 py-3 text-left">Навыки</th>
            </tr>
          </thead>
          <tbody>
            {artifacts.map((artifact) => (
              <tr
                key={artifact.id}
                className="cursor-pointer border-b border-brand-border/60 transition hover:bg-brand-muted/40"
                onClick={() => {
                  if (artifact.url) {
                    window.open(artifact.url, "_blank", "noopener,noreferrer");
                  }
                }}
              >
                <td className="px-4 py-3">
                  <p className="font-semibold text-brand-text">{artifact.title}</p>
                  {artifact.summary && <p className="text-xs text-slate-500">{artifact.summary}</p>}
                  <p className="text-xs text-slate-400">Создано {formatDate(artifact.createdAt)}</p>
                </td>
                <td className="px-4 py-3">
                  <Tag className={badgeColors[artifact.type] ?? badgeColors.default}>{artifact.type}</Tag>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {artifact.integration?.name ?? "Не указано"}
                  {artifact.integration?.type && (
                    <p className="text-xs text-slate-400">{artifact.integration.type}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {artifact.assignees.length === 0 ? (
                    <span className="text-xs text-slate-400">—</span>
                  ) : (
                    <div className="space-y-1">
                      {artifact.assignees.map((assignee) => (
                        <p key={`${artifact.id}-${assignee.employeeId}`} className="text-xs text-slate-600">
                          <span className="font-semibold text-brand-text">{assignee.name}</span> · {assignee.role}
                        </p>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {artifact.skills.length === 0 ? (
                    <span className="text-xs text-slate-400">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {artifact.skills.map((skill) => (
                        <span key={`${artifact.id}-${skill.skillId}`} className="text-xs text-slate-600">
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Артефакты</p>
        <h1 className="text-3xl font-semibold text-brand-text">Следы реальной работы команды</h1>
        <p className="text-base text-slate-600">
          Quadrant собирает таски, pull request’ы и документы. Смотрите, кто ведёт инициативы по навыкам и интеграциям.
        </p>
      </header>

      <Card className="space-y-4">
        <h2 className="text-xl font-semibold text-brand-text">Фильтры</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm text-brand-text">
            Тип
            <select
              className="mt-1 w-full rounded-2xl border border-brand-border/70 px-3 py-2 text-sm"
              value={filters.type}
              onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}
            >
              {artifactTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-brand-text">
            Интеграция
            <select
              className="mt-1 w-full rounded-2xl border border-brand-border/70 px-3 py-2 text-sm"
              value={filters.integrationId}
              onChange={(event) => setFilters((prev) => ({ ...prev, integrationId: event.target.value }))}
            >
              {integrationFilterOptions.map((integration) => (
                <option key={integration.id} value={integration.id}>
                  {integration.id === "all"
                    ? integration.name
                    : `${integration.name} (${integration.type})`}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-brand-text">
            Сотрудник
            <select
              className="mt-1 w-full rounded-2xl border border-brand-border/70 px-3 py-2 text-sm"
              value={filters.employeeId}
              onChange={(event) => setFilters((prev) => ({ ...prev, employeeId: event.target.value }))}
            >
              {employeeFilterOptions.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.id === "all"
                    ? "Все сотрудники"
                    : `${employee.name} · ${employee.position}`}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <SecondaryButton onClick={() => void handleApplyFilters()} className="px-5 py-2">
            Применить
          </SecondaryButton>
          <SecondaryButton onClick={() => handleResetFilters()} className="px-5 py-2 text-slate-500">
            Сбросить
          </SecondaryButton>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>

      {renderArtifacts()}
    </div>
  );
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

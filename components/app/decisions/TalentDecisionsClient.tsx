"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/common/Card";
import Modal from "@/components/common/Modal";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { TalentDecisionDTO, TalentDecisionStatus, TalentDecisionType } from "@/services/types/talentDecision";

const statusTabs: Array<{ key: string; label: string; status?: TalentDecisionStatus | "open" }> = [
  { key: "all", label: "Все" },
  { key: "open", label: "Открытые", status: "open" },
  { key: "proposed", label: "Предложено", status: "proposed" },
  { key: "approved", label: "Согласовано", status: "approved" },
  { key: "implemented", label: "Выполнено", status: "implemented" },
  { key: "rejected", label: "Отклонено", status: "rejected" },
];

const typeOptions: Array<{ value: "all" | TalentDecisionType; label: string }> = [
  { value: "all", label: "Все типы" },
  { value: "promote", label: "Повышение" },
  { value: "role_change", label: "Смена роли" },
  { value: "lateral_move", label: "Lateral move" },
  { value: "hire_external", label: "Найм внешних" },
  { value: "keep_in_place", label: "Оставить на роли" },
  { value: "monitor_risk", label: "Мониторинг риска" },
];

type EmployeeOption = { id: string; name: string; position?: string | null };

type CreateForm = {
  employeeId: string;
  type: TalentDecisionType;
  priority: "low" | "medium" | "high";
  title: string;
  rationale: string;
  risks: string;
  timeframe: string;
};

export default function TalentDecisionsClient() {
  const [decisions, setDecisions] = useState<TalentDecisionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | TalentDecisionType>("all");
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({
    employeeId: "",
    type: "promote",
    priority: "medium",
    title: "",
    rationale: "",
    risks: "",
    timeframe: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadEmployees();
  }, []);

  useEffect(() => {
    void loadDecisions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter]);

  const filteredDecisions = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    if (!searchTerm) return decisions;
    return decisions.filter((d) => d.employeeName.toLowerCase().includes(searchTerm) || d.title.toLowerCase().includes(searchTerm));
  }, [decisions, search]);

  const loadEmployees = async () => {
    try {
      const response = await fetch("/api/app/employees?pageSize=200", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) return;
      setEmployees(payload.employees ?? []);
    } catch {
      // ignore
    }
  };

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (statusFilter === "open") {
      params.set("onlyOpen", "true");
    } else if (statusFilter !== "all") {
      params.append("status", statusFilter);
    }
    if (typeFilter !== "all") {
      params.append("type", typeFilter);
    }
    return params.toString();
  };

  const loadDecisions = async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildQuery();
      const response = await fetch(`/api/app/decisions${qs ? `?${qs}` : ""}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось загрузить решения");
      }
      setDecisions(payload.decisions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };
  const updateStatus = async (decisionId: string, status: TalentDecisionStatus) => {
    try {
      const response = await fetch("/api/app/decisions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisionId, status }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось обновить статус");
      }
      setDecisions((prev) => prev.map((item) => (item.id === decisionId ? payload.decision : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    }
  };

  const createDecision = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/app/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          sourceType: "manual",
          risks: createForm.risks || undefined,
          timeframe: createForm.timeframe || undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось создать решение");
      }
      setCreateOpen(false);
      setCreateForm({ employeeId: "", type: "promote", priority: "medium", title: "", rationale: "", risks: "", timeframe: "" });
      await loadDecisions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Решения</p>
          <h1 className="text-3xl font-semibold text-brand-text">Решения по людям</h1>
          <p className="text-sm text-slate-600">Повышения, переводы, найм и риски удержания.</p>
        </div>
        <div className="flex gap-2">
          <PrimaryButton onClick={() => setCreateOpen(true)} className="px-4 py-2">
            Добавить решение
          </PrimaryButton>
          <SecondaryButton onClick={() => void loadDecisions()} disabled={loading} className="px-4 py-2">
            Обновить
          </SecondaryButton>
        </div>
      </div>

      {error && <Card className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>}

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {statusTabs.map((tab) => (
            <Tag
              key={tab.key}
              variant={statusFilter === tab.key ? "default" : "outline"}
              onClick={() => setStatusFilter(tab.key)}
              className="cursor-pointer"
            >
              {tab.label}
            </Tag>
          ))}
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as "all" | TalentDecisionType)}
            className="rounded-xl border border-brand-border px-3 py-2 text-sm"
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по сотруднику или решению"
            className="flex-1 min-w-[200px] rounded-xl border border-brand-border px-3 py-2 text-sm"
          />
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Решения</p>
            <h2 className="text-xl font-semibold text-brand-text">Борд решений</h2>
          </div>
          <span className="text-sm text-slate-500">{loading ? "Загрузка…" : `Всего: ${filteredDecisions.length}`}</span>
        </div>
        {filteredDecisions.length === 0 ? (
          <p className="text-sm text-slate-500">Пока нет решений по людям. Завершите пилоты или добавьте решение вручную.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Сотрудник</th>
                  <th className="px-3 py-2">Тип</th>
                  <th className="px-3 py-2">Статус</th>
                  <th className="px-3 py-2">Заголовок</th>
                  <th className="px-3 py-2">Источник</th>
                  <th className="px-3 py-2">Создано</th>
                  <th className="px-3 py-2 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredDecisions.map((decision) => (
                  <tr key={decision.id} className="border-t border-brand-border/60">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-brand-text">{decision.employeeName}</p>
                      <p className="text-xs text-slate-500">{decision.employeeRole ?? "Роль не указана"}</p>
                      {decision.teamName && <p className="text-xs text-slate-500">Команда: {decision.teamName}</p>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        <Tag variant="outline">{formatType(decision.type)}</Tag>
                        <Tag variant="outline">Приоритет: {decision.priority}</Tag>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={decision.status}
                        onChange={(event) => void updateStatus(decision.id, event.target.value as TalentDecisionStatus)}
                        className="rounded-xl border border-brand-border px-3 py-2 text-sm"
                      >
                        <option value="proposed">Предложено</option>
                        <option value="approved">Согласовано</option>
                        <option value="implemented">Выполнено</option>
                        <option value="rejected">Отклонено</option>
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-brand-text">{decision.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-3">{decision.rationale}</p>
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-600">
                      {decision.sourceLabel ? (
                        <span>
                          {formatSource(decision.sourceType)}: {decision.sourceLabel}
                        </span>
                      ) : (
                        <span className="text-slate-400">{formatSource(decision.sourceType)}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500">{new Date(decision.createdAt).toLocaleDateString("ru-RU")}</td>
                    <td className="px-3 py-3 text-right">
                      {decision.sourceId ? (
                        <SecondaryButton href={`/app/${mapSourceUrl(decision)}`} className="px-3 py-1 text-xs">
                          Открыть источник
                        </SecondaryButton>
                      ) : (
                        <span className="text-xs text-slate-400">Без ссылки</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={createOpen}
        title="Новое решение"
        description="Зафиксируйте решение по сотруднику"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <SecondaryButton onClick={() => setCreateOpen(false)}>Отмена</SecondaryButton>
            <PrimaryButton onClick={() => void createDecision()} disabled={saving || !createForm.employeeId || !createForm.title || !createForm.rationale}>
              Сохранить
            </PrimaryButton>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <label className="space-y-1 block">
            <span className="text-slate-600">Сотрудник</span>
            <select
              value={createForm.employeeId}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, employeeId: event.target.value }))}
              className="w-full rounded-xl border border-brand-border px-3 py-2"
            >
              <option value="">Выберите сотрудника</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} — {emp.position ?? "роль не указана"}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 block">
              <span className="text-slate-600">Тип решения</span>
              <select
                value={createForm.type}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, type: event.target.value as TalentDecisionType }))}
                className="w-full rounded-xl border border-brand-border px-3 py-2"
              >
                {typeOptions
                  .filter((opt) => opt.value !== "all")
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="text-slate-600">Приоритет</span>
              <select
                value={createForm.priority}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, priority: event.target.value as "low" | "medium" | "high" }))}
                className="w-full rounded-xl border border-brand-border px-3 py-2"
              >
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
              </select>
            </label>
          </div>
          <label className="space-y-1 block">
            <span className="text-slate-600">Заголовок</span>
            <input
              value={createForm.title}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
              className="w-full rounded-xl border border-brand-border px-3 py-2"
              placeholder="Повысить до Senior, перевести в продуктовую команду"
            />
          </label>
          <label className="space-y-1 block">
            <span className="text-slate-600">Причина</span>
            <textarea
              value={createForm.rationale}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, rationale: event.target.value }))}
              className="w-full rounded-xl border border-brand-border px-3 py-2"
              rows={3}
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 block">
              <span className="text-slate-600">Риски (опционально)</span>
              <textarea
                value={createForm.risks}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, risks: event.target.value }))}
                className="w-full rounded-xl border border-brand-border px-3 py-2"
                rows={2}
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-slate-600">Сроки (опционально)</span>
              <input
                value={createForm.timeframe}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, timeframe: event.target.value }))}
                className="w-full rounded-xl border border-brand-border px-3 py-2"
                placeholder="1-3 месяца / после пилота"
              />
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
function formatType(type: TalentDecisionType) {
  const map: Record<TalentDecisionType, string> = {
    promote: "Повышение",
    lateral_move: "Lateral move",
    role_change: "Смена роли",
    keep_in_place: "Оставить на роли",
    hire_external: "Найм внешних",
    monitor_risk: "Мониторить риск",
  };
  return map[type] ?? type;
}

function formatSource(source: TalentDecisionDTO["sourceType"]) {
  const map: Record<TalentDecisionDTO["sourceType"], string> = {
    pilot: "Из пилота",
    report: "Из отчёта",
    meeting: "Из встречи",
    manual: "Ручной ввод",
  };
  return map[source] ?? source;
}

function mapSourceUrl(decision: TalentDecisionDTO) {
  switch (decision.sourceType) {
    case "pilot":
      return `pilot/${decision.sourceId}`;
    case "report":
      return `reports/${decision.sourceId}`;
    case "meeting":
      return `meetings/${decision.sourceId}`;
    default:
      return "decisions";
  }
}

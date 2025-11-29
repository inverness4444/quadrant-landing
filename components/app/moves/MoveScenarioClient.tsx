"use client";

import { useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { MoveScenarioActionDTO, MoveScenarioDTO } from "@/services/types/moves";

type MoveScenarioClientProps = {
  scenario: MoveScenarioDTO;
};

export default function MoveScenarioClient({ scenario: initialScenario }: MoveScenarioClientProps) {
  const [scenario, setScenario] = useState<MoveScenarioDTO>(initialScenario);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionForm, setActionForm] = useState<Partial<MoveScenarioActionDTO>>({
    type: "develop",
    priority: "medium",
    jobRoleId: "",
    teamId: "",
    fromEmployeeId: "",
  });
  // reserved for future "add to report" flow
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [addingToReport, setAddingToReport] = useState(false);

  const refresh = async () => {
    const response = await fetch(`/api/app/moves/scenarios/${scenario.id}`, { cache: "no-store" });
    const payload = await response.json();
    if (response.ok && payload?.ok) {
      setScenario(payload.scenario);
    }
  };

  const updateStatus = async (status: MoveScenarioDTO["status"]) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/app/moves/scenarios/${scenario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось обновить статус");
      }
      setScenario(payload.scenario);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  const addAction = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/app/moves/scenarios/${scenario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionForm }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось добавить действие");
      }
      setScenario(payload.scenario);
      setActionForm({ type: "develop", priority: "medium", jobRoleId: "", teamId: "", fromEmployeeId: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    setExporting(true);
    try {
      const header = [
        "type",
        "teamId",
        "jobRoleId",
        "fromEmployeeId",
        "toEmployeeId",
        "priority",
        "estimatedTimeMonths",
        "estimatedCostHire",
        "estimatedCostDevelop",
      ];
      const rows = scenario.actions.map((action) => [
        action.type,
        action.teamId ?? "",
        action.jobRoleId ?? "",
        action.fromEmployeeId ?? "",
        action.toEmployeeId ?? "",
        action.priority,
        action.estimatedTimeMonths ?? "",
        action.estimatedCostHire ?? "",
        action.estimatedCostDevelop ?? "",
      ]);
      const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `quadrant_scenario_${scenario.id}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const createQuestFromAction = async (action: MoveScenarioActionDTO) => {
    if (!action.fromEmployeeId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/app/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Подготовка к роли ${action.jobRoleId ?? ""}`,
          description: "Квест создан из сценария перемещений для развития под целевую роль.",
          ownerEmployeeId: action.fromEmployeeId,
          relatedTeamId: action.teamId,
          goalType: "develop_skill",
          priority: "medium",
          steps: [
            {
              title: "Собрать подтверждения по ключевым навыкам",
              description: "Подготовить артефакты и ревью для перехода на новую роль.",
              order: 1,
              required: true,
              relatedSkillId: action.skillId ?? null,
            },
          ],
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось создать квест");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  const addScenarioToReport = async () => {
    setAddingToReport(true);
    setError(null);
    try {
      const response = await fetch("/api/app/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "workspace",
          title: `Решения: ${scenario.title}`,
          autoGenerate: false,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось создать отчёт");
      }
      await fetch(`/api/app/reports/${payload.report.id}/sections/${payload.report.sections?.[0]?.id ?? ""}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentMarkdown: `- Сценарий: ${scenario.title}\n- Действий: ${scenario.actions.length}`,
        }),
      }).catch(() => null);
      alert("Сценарий добавлен в отчёт");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка добавления в отчёт");
    } finally {
      setAddingToReport(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Сценарий</p>
          <h1 className="text-3xl font-semibold text-brand-text">{scenario.title}</h1>
          <p className="text-sm text-slate-600">{scenario.description ?? "Описание не указано"}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            <Tag variant="outline">Статус: {formatStatus(scenario.status)}</Tag>
            <Tag variant="outline">Действий: {scenario.actions.length}</Tag>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {["draft", "review", "approved", "archived"].map((status) => (
            <SecondaryButton key={status} onClick={() => void updateStatus(status as MoveScenarioDTO["status"])} className="px-3 py-1 text-xs">
              {formatStatus(status)}
            </SecondaryButton>
          ))}
          <PrimaryButton onClick={() => void exportCsv()} disabled={exporting} className="px-3 py-1 text-xs">
            {exporting ? "Готовим CSV…" : "Экспортировать в CSV"}
          </PrimaryButton>
          <SecondaryButton onClick={() => void addScenarioToReport()} className="px-3 py-1 text-xs">
            Добавить в отчёт
          </SecondaryButton>
        </div>
      </div>

      {error && <Card className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>}

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-text">Действия</h2>
          <SecondaryButton onClick={() => void refresh()} className="px-3 py-1 text-xs">
            Обновить
          </SecondaryButton>
        </div>
        {scenario.actions.length === 0 ? (
          <p className="text-sm text-slate-500">Действий пока нет.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Тип</th>
                  <th className="px-3 py-2">Команда</th>
                  <th className="px-3 py-2">Роль</th>
                  <th className="px-3 py-2">Сотрудник</th>
                  <th className="px-3 py-2">Приоритет</th>
                  <th className="px-3 py-2 text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {scenario.actions.map((action) => (
                  <tr key={action.id}>
                    <td className="px-3 py-3">{formatActionType(action.type)}</td>
                    <td className="px-3 py-3 text-slate-600">{action.teamId ?? "—"}</td>
                    <td className="px-3 py-3 text-slate-600">{action.jobRoleId ?? "—"}</td>
                    <td className="px-3 py-3 text-slate-600">{action.fromEmployeeId ?? action.toEmployeeId ?? "—"}</td>
                    <td className="px-3 py-3 text-slate-600">{formatPriority(action.priority)}</td>
                    <td className="px-3 py-3 text-right">
                      {(action.type === "develop" || action.type === "promote") && (
                        <PrimaryButton
                          onClick={() => void createQuestFromAction(action)}
                          className="px-3 py-1 text-xs"
                          disabled={loading || !action.fromEmployeeId}
                        >
                          Квест развития
                        </PrimaryButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <h3 className="text-lg font-semibold text-brand-text">Добавить действие</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm text-slate-600">
            Тип
            <select
              value={actionForm.type ?? "develop"}
              onChange={(event) => setActionForm((prev) => ({ ...prev, type: event.target.value as MoveScenarioActionDTO["type"] }))}
              className="mt-1 w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
            >
              <option value="hire">Нанять</option>
              <option value="develop">Развить</option>
              <option value="reassign">Перераспределить</option>
              <option value="promote">Повысить</option>
              <option value="backfill">Backfill</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Команда
            <input
              value={actionForm.teamId ?? ""}
              onChange={(event) => setActionForm((prev) => ({ ...prev, teamId: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
              placeholder="ID команды (опционально)"
            />
          </label>
          <label className="text-sm text-slate-600">
            Роль
            <input
              value={actionForm.jobRoleId ?? ""}
              onChange={(event) => setActionForm((prev) => ({ ...prev, jobRoleId: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
              placeholder="ID роли"
            />
          </label>
          <label className="text-sm text-slate-600">
            Сотрудник (from)
            <input
              value={actionForm.fromEmployeeId ?? ""}
              onChange={(event) => setActionForm((prev) => ({ ...prev, fromEmployeeId: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
              placeholder="ID сотрудника"
            />
          </label>
          <label className="text-sm text-slate-600">
            Навык (опционально)
            <input
              value={actionForm.skillId ?? ""}
              onChange={(event) => setActionForm((prev) => ({ ...prev, skillId: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
              placeholder="ID навыка"
            />
          </label>
          <label className="text-sm text-slate-600">
            Приоритет
            <select
              value={actionForm.priority ?? "medium"}
              onChange={(event) => setActionForm((prev) => ({ ...prev, priority: event.target.value as MoveScenarioActionDTO["priority"] }))}
              className="mt-1 w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
            >
              <option value="low">Низкий</option>
              <option value="medium">Средний</option>
              <option value="high">Высокий</option>
            </select>
          </label>
        </div>
        <PrimaryButton onClick={() => void addAction()} disabled={loading} className="px-4 py-2">
          Добавить действие
        </PrimaryButton>
      </Card>
    </div>
  );
}

function formatStatus(status: string) {
  const map: Record<string, string> = {
    draft: "Черновик",
    review: "На согласовании",
    approved: "Одобрено",
    archived: "Архив",
  };
  return map[status] ?? status;
}

function formatActionType(type: string) {
  const map: Record<string, string> = {
    hire: "Нанять",
    develop: "Развить",
    reassign: "Перераспределить",
    promote: "Повысить",
    backfill: "Backfill",
  };
  return map[type] ?? type;
}

function formatPriority(priority: string) {
  const map: Record<string, string> = {
    low: "Низкий",
    medium: "Средний",
    high: "Высокий",
  };
  return map[priority] ?? priority;
}

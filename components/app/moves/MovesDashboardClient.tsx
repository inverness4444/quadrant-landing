"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { JobRoleDTO, MoveScenarioDTO } from "@/services/types/moves";

type MovesDashboardClientProps = {
  workspaceName: string;
  initialRoles: JobRoleDTO[];
  initialScenarios: MoveScenarioDTO[];
  activePilot?: { id: string; name: string; status: string; summaryProgress: { percent: number } };
};

export default function MovesDashboardClient({
  workspaceName,
  initialRoles,
  initialScenarios,
  activePilot,
}: MovesDashboardClientProps) {
  const router = useRouter();
  const [roles, setRoles] = useState<JobRoleDTO[]>(initialRoles);
  const [scenarios, setScenarios] = useState<MoveScenarioDTO[]>(initialScenarios);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleFormOpen, setRoleFormOpen] = useState(false);
  const [scenarioFormOpen, setScenarioFormOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
    levelBand: "",
    isLeadership: false,
    requirements: [{ skillId: "", requiredLevel: 3, importance: "must_have" as const }],
  });
  const [scenarioForm, setScenarioForm] = useState({
    title: "",
    description: "",
  });
  const [criticalTeams, setCriticalTeams] = useState<
    Array<{
      teamId: string;
      teamName: string;
      riskSkills: number;
      singlePoints: number;
      rolesWithoutCandidates: number;
    }>
  >([]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesResp, scenariosResp] = await Promise.all([
        fetch("/api/app/moves/roles", { cache: "no-store" }),
        fetch("/api/app/moves/scenarios", { cache: "no-store" }),
      ]);
      const rolesJson = await rolesResp.json();
      const scenariosJson = await scenariosResp.json();
      if (!rolesResp.ok || !rolesJson?.ok) {
        throw new Error(rolesJson?.error?.message ?? "Не удалось загрузить роли");
      }
      if (!scenariosResp.ok || !scenariosJson?.ok) {
        throw new Error(scenariosJson?.error?.message ?? "Не удалось загрузить сценарии");
      }
      setRoles(rolesJson.roles ?? []);
      setScenarios(scenariosJson.scenarios ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreateRole = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/app/moves/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...roleForm,
          description: roleForm.description || null,
          levelBand: roleForm.levelBand || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось создать роль");
      }
      setRoleFormOpen(false);
      setRoleForm({
        name: "",
        description: "",
        levelBand: "",
        isLeadership: false,
        requirements: [{ skillId: "", requiredLevel: 3, importance: "must_have" }],
      });
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }, [refreshData, roleForm]);

  const loadCriticalTeams = useCallback(async () => {
    try {
      const skillMapResp = await fetch("/api/app/analytics/skill-map", { cache: "no-store" });
      const mapJson = await skillMapResp.json().catch(() => null);
      if (!skillMapResp.ok || !mapJson?.ok) return;
      const teams: Array<{ teamId: string | null; teamName: string }> = mapJson.map.teams ?? [];
      const candidates = teams.filter((team) => team.teamId).slice(0, 3);
      const summaries: typeof criticalTeams = [];
      for (const team of candidates) {
        const summaryResp = await fetch(`/api/app/moves/teams/${team.teamId}/summary`, { cache: "no-store" });
        const summaryJson = await summaryResp.json().catch(() => null);
        if (summaryResp.ok && summaryJson?.ok) {
          summaries.push({
            teamId: summaryJson.summary.team.teamId,
            teamName: summaryJson.summary.team.teamName,
            riskSkills: summaryJson.summary.summaryMetrics.totalRiskSkillsCount,
            singlePoints: summaryJson.summary.summaryMetrics.singlePointOfFailureCount,
            rolesWithoutCandidates: summaryJson.summary.summaryMetrics.rolesWithoutInternalCandidatesCount,
          });
        }
      }
      setCriticalTeams(summaries);
    } catch (err) {
      void err;
    }
  }, []);

  const generateScenario = useCallback(
    async (teamId?: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/app/moves/scenarios/suggest-from-risks", {
          method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: teamId ?? undefined }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось сгенерировать сценарий");
      }
      await refreshData();
      router.push(`/app/moves/scenarios/${payload.scenario.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Неизвестная ошибка");
      } finally {
        setLoading(false);
      }
    },
    [refreshData, router],
  );

  const handleCreateScenario = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/app/moves/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scenarioForm,
          actions: [],
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось создать сценарий");
      }
      setScenarioFormOpen(false);
      setScenarioForm({ title: "", description: "" });
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }, [refreshData, scenarioForm]);

  useEffect(() => {
    void refreshData();
    void loadCriticalTeams();
  }, [loadCriticalTeams, refreshData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Решения</p>
          <h1 className="text-3xl font-semibold text-brand-text">Решения: найм, развитие, перемещения</h1>
          <p className="text-sm text-slate-600">
            Помогает понять, когда логичнее нанять, развивать или перевести людей в workspace «{workspaceName}».
          </p>
        </div>
        <div className="flex gap-2">
          <PrimaryButton onClick={() => setRoleFormOpen(true)} className="px-4 py-2">
            Создать роль
          </PrimaryButton>
          <PrimaryButton onClick={() => setScenarioFormOpen(true)} className="px-4 py-2">
            Создать сценарий
          </PrimaryButton>
        </div>
      </div>

      {activePilot && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border border-brand-border/60 bg-brand-muted px-4 py-3 text-sm text-slate-700">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Пилот</p>
            <p className="font-semibold text-brand-text">
              Сейчас идёт пилот: {activePilot.name} — {activePilot.summaryProgress.percent}% завершено
            </p>
          </div>
          <PrimaryButton href={`/app/pilot/${activePilot.id}`} className="px-3 py-1 text-xs">
            Перейти к пилоту
          </PrimaryButton>
        </Card>
      )}

      {error && <Card className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>}

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Критичные команды</p>
            <h2 className="text-xl font-semibold text-brand-text">Где горит сильнее</h2>
          </div>
          <SecondaryButton onClick={() => void loadCriticalTeams()} className="px-3 py-1 text-xs">
            Обновить
          </SecondaryButton>
        </div>
        {criticalTeams.length === 0 ? (
          <p className="text-sm text-slate-500">Недостаточно данных. Создайте роли и запустите оценки, чтобы увидеть риски по командам.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {criticalTeams.map((team) => (
              <div key={team.teamId} className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-600">
                <p className="font-semibold text-brand-text">{team.teamName}</p>
                <p className="text-xs text-slate-500">Критичные навыки: {team.riskSkills}</p>
                <p className="text-xs text-slate-500">Single point: {team.singlePoints}</p>
                <p className="text-xs text-slate-500">Ролей без кандидатов: {team.rolesWithoutCandidates}</p>
                <PrimaryButton onClick={() => void generateScenario(team.teamId)} className="mt-2 px-3 py-1 text-xs">
                  Сгенерировать сценарий
                </PrimaryButton>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Роли</p>
              <h2 className="text-xl font-semibold text-brand-text">Идеальные профили</h2>
            </div>
            <SecondaryButton onClick={() => void refreshData()} className="px-3 py-1 text-xs">
              Обновить
            </SecondaryButton>
          </div>
          {roles.length === 0 ? (
            <p className="text-sm text-slate-500">Роли ещё не заданы.</p>
          ) : (
            <div className="space-y-2">
              {roles.map((role) => (
                <div key={role.id} className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-text">{role.name}</p>
                      <p className="text-xs text-slate-500">{role.description ?? "Описание не указано"}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                        {role.levelBand && <Tag variant="outline">Грейд: {role.levelBand}</Tag>}
                        {role.isLeadership && <Tag variant="outline">Лидерская роль</Tag>}
                        <Tag variant="outline">Навыков: {role.requirements.length}</Tag>
                      </div>
                    </div>
                  </div>
                  {role.requirements.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      {role.requirements.slice(0, 3).map((req) => (
                        <Tag key={req.id} variant="outline">
                          {req.skillId} · {req.requiredLevel}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Сценарии</p>
                <h2 className="text-xl font-semibold text-brand-text">Найм и перемещения</h2>
              </div>
            <div className="flex gap-2">
              <SecondaryButton onClick={() => void refreshData()} className="px-3 py-1 text-xs">
                Обновить
              </SecondaryButton>
              <PrimaryButton onClick={() => void generateScenario()} className="px-3 py-1 text-xs">
                Сгенерировать по рискам workspace
              </PrimaryButton>
            </div>
            </div>
          {scenarios.length === 0 ? (
            <p className="text-sm text-slate-500">Сценарии ещё не созданы.</p>
          ) : (
            <div className="space-y-2">
              {scenarios.map((scenario) => (
                <div key={scenario.id} className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-text">{scenario.title}</p>
                      <p className="text-xs text-slate-500">{scenario.description ?? "Описание не указано"}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>Статус: {formatStatus(scenario.status)}</p>
                      <p>Действий: {scenario.actions.length}</p>
                    </div>
                  </div>
                  <SecondaryButton href={`/app/moves/scenarios/${scenario.id}`} className="mt-2 px-3 py-1 text-xs">
                    Открыть
                  </SecondaryButton>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {roleFormOpen && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-brand-text">Новая роль</h3>
            <SecondaryButton onClick={() => setRoleFormOpen(false)} className="px-3 py-1 text-xs">
              Закрыть
            </SecondaryButton>
          </div>
          <input
            value={roleForm.name}
            onChange={(event) => setRoleForm((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
            placeholder="Название роли"
          />
          <textarea
            value={roleForm.description}
            onChange={(event) => setRoleForm((prev) => ({ ...prev, description: event.target.value }))}
            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
            placeholder="Описание"
            rows={2}
          />
          <div className="grid gap-2 md:grid-cols-2">
            <input
              value={roleForm.levelBand}
              onChange={(event) => setRoleForm((prev) => ({ ...prev, levelBand: event.target.value }))}
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
              placeholder="Грейд/уровень (например, Senior)"
            />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={roleForm.isLeadership}
                onChange={(event) => setRoleForm((prev) => ({ ...prev, isLeadership: event.target.checked }))}
              />
              Лидерская роль
            </label>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-brand-text">Требования по навыкам</p>
              <SecondaryButton
                onClick={() =>
                  setRoleForm((prev) => ({
                    ...prev,
                    requirements: [
                      ...prev.requirements,
                      { skillId: "", requiredLevel: 3, importance: "must_have" as const },
                    ],
                  }))
                }
                className="px-3 py-1 text-xs"
              >
                Добавить навык
              </SecondaryButton>
            </div>
            {roleForm.requirements.map((req, index) => (
              <div key={index} className="rounded-xl border border-brand-border/70 p-3 text-sm text-slate-600">
                <input
                  value={req.skillId}
                  onChange={(event) =>
                    setRoleForm((prev) => {
                      const next = [...prev.requirements];
                      next[index] = { ...next[index], skillId: event.target.value };
                      return { ...prev, requirements: next };
                    })
                  }
                  className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm"
                  placeholder="ID навыка"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={req.requiredLevel}
                    onChange={(event) =>
                      setRoleForm((prev) => {
                        const next = [...prev.requirements];
                        next[index] = { ...next[index], requiredLevel: Number(event.target.value) };
                        return { ...prev, requirements: next };
                      })
                    }
                    className="h-10 w-24 rounded-lg border border-brand-border px-3 text-sm"
                    placeholder="Уровень"
                  />
                  <select
                    value={req.importance}
                    onChange={(event) =>
                      setRoleForm((prev) => {
                        const next = [...prev.requirements];
                        next[index] = { ...next[index], importance: event.target.value as "must_have" | "nice_to_have" };
                        return { ...prev, requirements: next };
                      })
                    }
                    className="h-10 rounded-lg border border-brand-border px-3 text-sm"
                  >
                    <option value="must_have">Must have</option>
                    <option value="nice_to_have">Nice to have</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <PrimaryButton onClick={() => void handleCreateRole()} disabled={loading} className="px-4 py-2">
              Сохранить роль
            </PrimaryButton>
            <SecondaryButton onClick={() => setRoleFormOpen(false)} className="px-4 py-2">
              Отмена
            </SecondaryButton>
          </div>
        </Card>
      )}

      {scenarioFormOpen && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-brand-text">Новый сценарий</h3>
            <SecondaryButton onClick={() => setScenarioFormOpen(false)} className="px-3 py-1 text-xs">
              Закрыть
            </SecondaryButton>
          </div>
          <input
            value={scenarioForm.title}
            onChange={(event) => setScenarioForm((prev) => ({ ...prev, title: event.target.value }))}
            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
            placeholder="Название сценария"
          />
          <textarea
            value={scenarioForm.description}
            onChange={(event) => setScenarioForm((prev) => ({ ...prev, description: event.target.value }))}
            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
            placeholder="Описание"
            rows={3}
          />
          <div className="flex gap-2">
            <PrimaryButton onClick={() => void handleCreateScenario()} disabled={loading} className="px-4 py-2">
              Создать
            </PrimaryButton>
            <SecondaryButton onClick={() => setScenarioFormOpen(false)} className="px-4 py-2">
              Отмена
            </SecondaryButton>
          </div>
        </Card>
      )}
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

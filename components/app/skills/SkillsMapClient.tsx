"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/common/Card";
import Modal from "@/components/common/Modal";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import type { EmployeeSkillSnapshot, ProfileMatchScore, SkillGapAggregate, SkillGapForEmployee } from "@/services/types/skillsAnalytics";
import type { TalentDecisionType } from "@/services/types/talentDecision";

const LEVEL_COLORS = ["bg-slate-100", "bg-emerald-50", "bg-emerald-100", "bg-emerald-200", "bg-emerald-300", "bg-emerald-400"];

type ProfileOption = {
  id: string;
  name: string;
};

type TeamOption = { id: string; name: string };

type DecisionDraft = {
  employeeId: string;
  employeeName: string;
  type: TalentDecisionType;
  title: string;
  rationale: string;
};

export default function SkillsMapClient() {
  const [snapshots, setSnapshots] = useState<EmployeeSkillSnapshot[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [profileGaps, setProfileGaps] = useState<SkillGapForEmployee[]>([]);
  const [gapAggregates, setGapAggregates] = useState<SkillGapAggregate[]>([]);
  const [matchScores, setMatchScores] = useState<ProfileMatchScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [onlyProfileSkills, setOnlyProfileSkills] = useState(false);
  const [decisionDraft, setDecisionDraft] = useState<DecisionDraft | null>(null);
  const [savingDecision, setSavingDecision] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const teams: TeamOption[] = useMemo(() => {
    const unique = new Map<string, string>();
    snapshots.forEach((snap) => {
      if (snap.teamId) unique.set(snap.teamId, snap.teamName ?? "Команда без названия");
    });
    return [{ id: "all", name: "Все команды" }, ...Array.from(unique.entries()).map(([id, name]) => ({ id, name }))];
  }, [snapshots]);

  useEffect(() => {
    void loadProfiles();
  }, []);

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeam, selectedProfile]);

  const loadProfiles = async () => {
    try {
      const response = await fetch("/api/app/skills/profiles", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) return;
      setProfiles(payload.profiles ?? []);
    } catch {
      // ignore
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedTeam !== "all") params.set("teamId", selectedTeam);
      if (selectedProfile) params.set("profileId", selectedProfile);
      const response = await fetch(`/api/app/skills/map${params.toString() ? `?${params.toString()}` : ""}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось загрузить данные по навыкам");
      }
      setSnapshots(payload.snapshots ?? []);
      setProfileGaps(payload.profileGaps ?? []);
      setGapAggregates(payload.gapAggregates ?? []);
      setMatchScores(payload.profileMatchScores ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  const filteredSnapshots = useMemo(() => {
    const filterTeam = selectedTeam === "all" ? null : selectedTeam;
    const filterSkills = new Set<string>();
    if (onlyProfileSkills && selectedProfile) {
      profileGaps.forEach((gap) => filterSkills.add(gap.skillId));
    }
    const searchTerm = search.trim().toLowerCase();
    return snapshots.filter((snap) => {
      if (filterTeam && snap.teamId !== filterTeam) return false;
      if (searchTerm && !snap.employeeName.toLowerCase().includes(searchTerm)) return false;
      if (onlyProfileSkills && selectedProfile && !filterSkills.has(snap.skillId)) return false;
      return true;
    });
  }, [snapshots, selectedTeam, search, onlyProfileSkills, selectedProfile, profileGaps]);

  const employees = useMemo(() => {
    const map = new Map<string, { id: string; name: string; teamName?: string | null }>();
    filteredSnapshots.forEach((snap) => {
      map.set(snap.employeeId, { id: snap.employeeId, name: snap.employeeName, teamName: snap.teamName });
    });
    return Array.from(map.values());
  }, [filteredSnapshots]);

  const skillsColumns = useMemo(() => {
    const allSkillIds = new Map<string, string>();
    filteredSnapshots.forEach((snap) => allSkillIds.set(snap.skillId, snap.skillName));
    if (selectedProfile) {
      profileGaps.forEach((gap) => allSkillIds.set(gap.skillId, gap.skillName));
    }
    return Array.from(allSkillIds.entries())
      .slice(0, 12)
      .map(([id, name]) => ({ id, name }));
  }, [filteredSnapshots, profileGaps, selectedProfile]);

  const levelByEmployeeSkill = useMemo(() => {
    const map = new Map<string, number | null>();
    filteredSnapshots.forEach((snap) => {
      map.set(`${snap.employeeId}:${snap.skillId}`, snap.level);
    });
    return map;
  }, [filteredSnapshots]);

  const gapsByEmployee = useMemo(() => {
    const grouped = new Map<string, SkillGapForEmployee[]>();
    profileGaps.forEach((gap) => {
      const arr = grouped.get(gap.employeeId) ?? [];
      arr.push(gap);
      grouped.set(gap.employeeId, arr);
    });
    return grouped;
  }, [profileGaps]);

  const openDecisionFromGap = (gap: SkillGapForEmployee) => {
    setDecisionDraft({
      employeeId: gap.employeeId,
      employeeName: gap.employeeName,
      type: gap.delta >= 3 ? "monitor_risk" : "role_change",
      title: `Закрыть разрыв по ${gap.skillName} у ${gap.employeeName}`,
      rationale: `Требуется уровень ${gap.targetLevel}, сейчас ${gap.currentLevel ?? 0}. Вес ${gap.weight}.`,
    });
  };

  const openDecisionFromMatch = (score: ProfileMatchScore) => {
    setDecisionDraft({
      employeeId: score.employeeId,
      employeeName: score.employeeName,
      type: "promote",
      title: `Готов к роли ${score.profileName}`,
      rationale: `Match ${Math.round(score.matchPercent)}%, покрытие ${score.coveragePercent}% по профилю ${score.profileName}.`,
    });
  };

  const createDecision = async () => {
    if (!decisionDraft) return;
    setSavingDecision(true);
    setToast(null);
    try {
      const response = await fetch("/api/app/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: decisionDraft.employeeId,
          type: decisionDraft.type,
          priority: "medium",
          sourceType: "manual",
          title: decisionDraft.title,
          rationale: decisionDraft.rationale,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось создать решение");
      }
      setDecisionDraft(null);
      setToast("Решение создано. Откройте борд решений для деталей.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setSavingDecision(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Skills & Gaps</p>
          <h1 className="text-3xl font-semibold text-brand-text">Навыки и разрывы</h1>
          <p className="text-sm text-slate-600">Матрица навыков, сопоставление с профилями и быстрые решения по людям.</p>
        </div>
        <div className="flex gap-2">
          <SecondaryButton onClick={() => void loadData()} disabled={loading} className="px-4 py-2">
            Обновить
          </SecondaryButton>
          <PrimaryButton href="/app/decisions" className="px-4 py-2">
            Открыть решения
          </PrimaryButton>
        </div>
      </div>

      {error && <Card className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>}
      {toast && <Card className="border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{toast}</Card>}

      <Card className="space-y-3">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="space-y-1 text-sm text-slate-600">
            Команда
            <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm">
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-600">
            Профиль роли
            <select value={selectedProfile} onChange={(e) => setSelectedProfile(e.target.value)} className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm">
              <option value="">Без профиля</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-600">
            Поиск по сотруднику
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Введите имя"
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
            />
          </label>
          {selectedProfile && (
            <label className="mt-6 inline-flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={onlyProfileSkills} onChange={(e) => setOnlyProfileSkills(e.target.checked)} />
              Только навыки профиля
            </label>
          )}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Матрица</p>
            <h2 className="text-xl font-semibold text-brand-text">Навыки команды</h2>
            <p className="text-sm text-slate-500">Уровни навыков по сотрудникам. {loading ? "Загрузка..." : `${filteredSnapshots.length} записей`}.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead>
              <tr>
                <th className="px-3 py-2">Сотрудник</th>
                {skillsColumns.map((skill) => (
                  <th key={skill.id} className="px-3 py-2 text-xs text-slate-500">
                    {skill.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-t border-brand-border/60">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-brand-text">{emp.name}</p>
                    {emp.teamName && <p className="text-xs text-slate-500">{emp.teamName}</p>}
                  </td>
                  {skillsColumns.map((skill) => {
                    const level = levelByEmployeeSkill.get(`${emp.id}:${skill.id}`);
                    return (
                      <td key={skill.id} className="px-3 py-3 text-center">
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${LEVEL_COLORS[level ?? 0]}`}>
                          {level ?? "–"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedProfile && (
        <>
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Гэп по навыкам</p>
                <h2 className="text-xl font-semibold text-brand-text">Распределение разрывов</h2>
              </div>
            </div>
            {gapAggregates.length === 0 ? (
              <p className="text-sm text-slate-500">Команда соответствует профилю, явных разрывов нет.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-700">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Навык</th>
                      <th className="px-3 py-2">Средний разрыв</th>
                      <th className="px-3 py-2">Макс разрыв</th>
                      <th className="px-3 py-2">Сотрудников</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gapAggregates
                      .slice()
                      .sort((a, b) => b.avgDelta - a.avgDelta)
                      .map((gap) => (
                        <tr key={gap.skillId} className="border-t border-brand-border/60">
                          <td className="px-3 py-3">{gap.skillName}</td>
                          <td className="px-3 py-3">{gap.avgDelta.toFixed(1)}</td>
                          <td className="px-3 py-3">{gap.maxDelta}</td>
                          <td className="px-3 py-3">{gap.affectedEmployeesCount}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">По сотрудникам</p>
                <h2 className="text-xl font-semibold text-brand-text">Кого развивать</h2>
              </div>
            </div>
            {profileGaps.length === 0 ? (
              <p className="text-sm text-slate-500">Разрывов по выбранному профилю нет.</p>
            ) : (
              <div className="space-y-3">
                {Array.from(gapsByEmployee.entries()).map(([employeeId, gaps]) => {
                  const top = gaps.sort((a, b) => b.delta - a.delta).slice(0, 3);
                  return (
                    <div key={employeeId} className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-brand-text">{top[0]?.employeeName}</p>
                          {top[0]?.teamName && <p className="text-xs text-slate-500">{top[0]?.teamName}</p>}
                          <p className="text-xs text-slate-500">Главные разрывы:</p>
                          <ul className="list-disc pl-4 text-xs text-slate-600">
                            {top.map((gap) => (
                              <li key={gap.skillId}>
                                {gap.skillName}: Δ{gap.delta} (цель {gap.targetLevel}, сейчас {gap.currentLevel ?? 0})
                              </li>
                            ))}
                          </ul>
                        </div>
                        <PrimaryButton onClick={() => openDecisionFromGap(top[0]!) } className="px-3 py-2 text-xs">
                          Создать решение
                        </PrimaryButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Кандидаты</p>
                <h2 className="text-xl font-semibold text-brand-text">Топ на роль</h2>
              </div>
            </div>
            {matchScores.length === 0 ? (
              <p className="text-sm text-slate-500">Нет достаточных данных для кандидатов.</p>
            ) : (
              <div className="space-y-2">
                {matchScores.slice(0, 5).map((score) => (
                  <div key={score.employeeId} className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-brand-text">{score.employeeName}</p>
                        {score.teamName && <p className="text-xs text-slate-500">{score.teamName}</p>}
                        <p className="text-xs text-slate-500">Match: {score.matchPercent.toFixed(0)}% · Покрытие: {score.coveragePercent}%</p>
                      </div>
                      <div className="flex gap-2">
                        <SecondaryButton href={`/app/employee/${score.employeeId}`} className="px-3 py-1 text-xs">
                          Открыть
                        </SecondaryButton>
                        <PrimaryButton onClick={() => openDecisionFromMatch(score)} className="px-3 py-1 text-xs">
                          Решение
                        </PrimaryButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      <Modal
        open={decisionDraft !== null}
        title="Создать решение"
        description="Зафиксируйте действие по сотруднику"
        onClose={() => setDecisionDraft(null)}
        footer={
          <>
            <SecondaryButton onClick={() => setDecisionDraft(null)}>Отмена</SecondaryButton>
            <PrimaryButton onClick={() => void createDecision()} disabled={savingDecision}>
              Создать
            </PrimaryButton>
          </>
        }
      >
        {decisionDraft && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-700">
              Сотрудник: <span className="font-semibold">{decisionDraft.employeeName}</span>
            </p>
            <label className="space-y-1 block">
              <span className="text-slate-600">Тип решения</span>
              <select
                value={decisionDraft.type}
                onChange={(e) => setDecisionDraft((prev) => prev && { ...prev, type: e.target.value as TalentDecisionType })}
                className="w-full rounded-xl border border-brand-border px-3 py-2"
              >
                <option value="promote">Повышение</option>
                <option value="role_change">Смена роли</option>
                <option value="lateral_move">Lateral move</option>
                <option value="hire_external">Найм внешних</option>
                <option value="monitor_risk">Мониторить риск</option>
                <option value="keep_in_place">Оставить на роли</option>
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="text-slate-600">Заголовок</span>
              <input
                value={decisionDraft.title}
                onChange={(e) => setDecisionDraft((prev) => prev && { ...prev, title: e.target.value })}
                className="w-full rounded-xl border border-brand-border px-3 py-2"
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-slate-600">Обоснование</span>
              <textarea
                value={decisionDraft.rationale}
                onChange={(e) => setDecisionDraft((prev) => prev && { ...prev, rationale: e.target.value })}
                className="w-full rounded-xl border border-brand-border px-3 py-2"
                rows={3}
              />
            </label>
            <p className="text-xs text-slate-500">Решение сохраняется в борд «Решения по людям». Источник: Skills & Gaps Explorer.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { ArtifactType } from "@/drizzle/schema";
import type { TeamProfile } from "@/services/types/profile";
import type { QuestWithStepsDTO } from "@/services/types/quest";
import type { TeamAssessmentSummaryDTO } from "@/services/types/assessment";
import type { TeamRiskHiringSummaryDTO } from "@/services/types/moves";

type TeamProfileClientProps = {
  teamId: string;
  workspaceName: string;
  initialProfile: TeamProfile;
  teamQuests?: QuestWithStepsDTO[];
  assessmentSummary?: TeamAssessmentSummaryDTO | null;
  movesSummary?: TeamRiskHiringSummaryDTO;
  pilotRun?: { id: string; name: string };
};

export default function TeamProfileClient({
  teamId,
  workspaceName,
  initialProfile,
  teamQuests = [],
  assessmentSummary = null,
  movesSummary,
  pilotRun,
}: TeamProfileClientProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [creatingReport, setCreatingReport] = useState(false);

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/app/team/${teamId}/profile`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | { ok: boolean; profile: TeamProfile; error?: { message?: string } }
        | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось обновить профиль команды");
      }
      setProfile(payload.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  const generateScenario = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/app/moves/scenarios/suggest-from-risks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; scenario?: { id: string }; error?: { message?: string } }
        | null;
      if (!response.ok || !payload?.ok || !payload.scenario?.id) {
        throw new Error(payload?.error?.message ?? "Не удалось сгенерировать сценарий");
      }
      router.push(`/app/moves/scenarios/${payload.scenario.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setGenerating(false);
    }
  }, [router, teamId]);

  const createTeamReport = useCallback(async () => {
    setCreatingReport(true);
    setError(null);
    try {
      const response = await fetch("/api/app/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "team",
          title: `Отчёт по команде ${profile.teamName}`,
          teamId,
          autoGenerate: true,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error?.message ?? "Не удалось создать отчёт");
      router.push(`/app/reports/${payload.report.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setCreatingReport(false);
    }
  }, [profile.teamName, router, teamId]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Команда workspace «{workspaceName}»</p>
          <h1 className="text-3xl font-semibold text-brand-text">{profile.teamName}</h1>
          <p className="text-base text-slate-600">
            Карточка команды с навыками, артефактами и инсайтами Quadrant.
          </p>
          {pilotRun && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-brand-border px-3 py-1 text-xs font-semibold text-brand-primary">
              Входит в пилот:{" "}
              <button type="button" onClick={() => router.push(`/app/pilot/${pilotRun.id}`)} className="underline">
                {pilotRun.name}
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton href="/app/team" className="px-4 py-2">
            К списку команд
          </SecondaryButton>
          <PrimaryButton onClick={() => void refreshProfile()} disabled={loading} className="px-4 py-2">
            {loading ? "Обновляем…" : "Обновить данные"}
          </PrimaryButton>
        </div>
      </div>

      {error && (
        <Card className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}{" "}
          <button type="button" className="font-semibold underline" onClick={() => void refreshProfile()}>
            Повторить
          </button>
        </Card>
      )}

      <Card className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Карточка команды</p>
            <h2 className="text-xl font-semibold text-brand-text">Снимок команды</h2>
            <p className="text-sm text-slate-500">Лид, состав и ключевые метрики.</p>
          </div>
          {profile.lead && (
            <div className="rounded-2xl border border-brand-border/70 px-4 py-3 text-sm text-slate-600">
              <p className="text-xs uppercase tracking-wide text-slate-400">Лидер</p>
              <p className="font-semibold text-brand-text">{profile.lead.name}</p>
              <p>{profile.lead.position}</p>
            </div>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Людей", value: profile.metrics.headcount },
            { label: "Навыков", value: profile.metrics.skillCount },
            { label: "Навыки в риске", value: profile.metrics.highRiskSkills },
            { label: "Bus factor = 1", value: profile.metrics.singlePointsOfFailure },
            { label: "Артефакты", value: profile.metrics.artifactCount },
          ].map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-white/60 bg-white/90 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">{metric.label}</p>
              <p className="text-2xl font-semibold text-brand-text">{metric.value}</p>
            </div>
          ))}
        </div>
        {!profile.dataStatus.hasSkills && (
          <p className="rounded-2xl border border-dashed border-brand-border/60 p-4 text-sm text-slate-500">
            Для этой команды пока нет карты навыков. Уточните навыки у сотрудников, чтобы Quadrant показал аналитику.
          </p>
        )}
        {!profile.dataStatus.hasArtifacts && (
          <p className="rounded-2xl border border-dashed border-brand-border/60 p-4 text-sm text-slate-500">
            Quadrant не видит артефактов команды. Подключите интеграции и назначьте участников в задачах.
          </p>
        )}
      </Card>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Состав</p>
            <h2 className="text-xl font-semibold text-brand-text">Сотрудники и роли</h2>
            <p className="text-sm text-slate-500">Кликните на сотрудника, чтобы открыть профиль.</p>
          </div>
          {profile.members.length === 0 ? (
            <p className="text-sm text-slate-500">В эту команду ещё не назначено сотрудников.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Сотрудник</th>
                    <th className="px-3 py-2">Роль</th>
                    <th className="px-3 py-2">Навыки</th>
                    <th className="px-3 py-2 text-right">Артефакты</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60">
                  {profile.members.map((member) => (
                    <tr key={member.id} className="hover:bg-brand-muted/40">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <Link href={`/app/employee/${member.id}`} className="font-semibold text-brand-primary">
                              {member.name}
                            </Link>
                            <p className="text-xs text-slate-500">{member.level}</p>
                          </div>
                          {member.isSinglePoint && <Tag variant="outline">bus factor 1</Tag>}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{member.position}</td>
                      <td className="px-3 py-3 text-slate-600">
                        {member.keySkills} ключевых / {member.supportingSkills} поддерживающих
                        {member.topSkills.length > 0 && (
                          <p className="text-xs text-slate-500">Сильные: {member.topSkills.join(", ")}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600">{member.artifactCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Инсайты</p>
            <h2 className="text-xl font-semibold text-brand-text">Подсказки для лида</h2>
            <p className="text-sm text-slate-500">Quadrant анализирует риски и нагрузку команды.</p>
          </div>
          {profile.insights.length === 0 ? (
            <p className="text-sm text-slate-500">Инсайтов пока нет — добавьте больше данных по навыкам и задачам.</p>
          ) : (
            <div className="space-y-3">
              {profile.insights.map((insight) => (
                <div key={insight.id} className="rounded-2xl border border-white/60 bg-white/90 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-brand-text">{formatInsightKind(insight.kind)}</p>
                  <p className="mt-1">{insight.text}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <Card className="space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Профиль навыков</p>
            <h2 className="text-xl font-semibold text-brand-text">Топ-10 навыков команды</h2>
            <p className="text-sm text-slate-500">Покрытие и средний уровень по команде.</p>
          </div>
        </div>
        {profile.skills.length === 0 ? (
          <p className="text-sm text-slate-500">Навыки ещё не назначены сотрудникам этой команды.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Навык</th>
                  <th className="px-3 py-2">Людей владеют</th>
                  <th className="px-3 py-2">Покрытие</th>
                  <th className="px-3 py-2">Средний уровень</th>
                  <th className="px-3 py-2">Риск</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {profile.skills.map((skill) => (
                  <tr key={skill.skillId}>
                    <td className="px-3 py-3 font-semibold text-brand-text">{skill.name}</td>
                    <td className="px-3 py-3 text-slate-600">{skill.owners}</td>
                    <td className="px-3 py-3 text-slate-600">{skill.coverage.toFixed(1)}%</td>
                    <td className="px-3 py-3 text-slate-600">{skill.averageLevel.toFixed(1)}/5</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${riskBadge(skill.risk)}`}>
                        {formatRisk(skill.risk)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {profile.riskySkills.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Навыки в зоне риска</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {profile.riskySkills.map((skill) => (
                <li key={`risk-${skill.skillId}`}>
                  {skill.name} — {skill.owners} человека · покрытие {skill.coverage.toFixed(1)}%
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {assessmentSummary && (
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Результаты оценки</p>
            <h2 className="text-xl font-semibold text-brand-text">Последний цикл</h2>
            </div>
            <Tag variant="outline">Gap: {assessmentSummary.averageGap}</Tag>
          </div>
          <p className="text-sm text-slate-600">
            Самооценка завершена у {assessmentSummary.selfSubmittedPercent}% участников, финал — {assessmentSummary.finalizedPercent}%.
          </p>
        </Card>
      )}

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Решения (найм/перемещения)</p>
            <h2 className="text-xl font-semibold text-brand-text">Потребности в ролях</h2>
            <p className="text-sm text-slate-600">
              Используем риски и требования ролей, чтобы подсказать, где нужен найм или развитие.
            </p>
          </div>
          <PrimaryButton onClick={() => void generateScenario()} disabled={generating} className="px-4 py-2">
            {generating ? "Генерируем…" : "Сценарий для команды"}
          </PrimaryButton>
          <SecondaryButton onClick={() => void createTeamReport()} className="px-4 py-2">
            Собрать отчёт
          </SecondaryButton>
        </div>
        {movesSummary ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-4">
              <Metric label="Критичные навыки" value={movesSummary.summaryMetrics.totalRiskSkillsCount} />
              <Metric label="Bus factor = 1" value={movesSummary.summaryMetrics.singlePointOfFailureCount} />
              <Metric label="Без кандидатов" value={movesSummary.summaryMetrics.rolesWithoutInternalCandidatesCount} />
              <Metric label="Развивать внутри" value={movesSummary.summaryMetrics.suggestedDevelopCount} />
            </div>
            {movesSummary.keySkills.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">Критичные навыки</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {movesSummary.keySkills.slice(0, 3).map((skill) => (
                    <li key={skill.skillId}>
                      {skill.skillName}: bus factor {skill.busFactor}{" "}
                      {skill.isSinglePointOfFailure ? "· один владелец" : ""} (
                      {skill.owners.map((owner) => owner.name).join(", ")})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-brand-text">Роли без внутренних кандидатов</p>
              {movesSummary.roles.filter((role) => role.hireRequired).slice(0, 3).length === 0 ? (
                <p className="text-sm text-slate-500">
                  Все роли можно закрыть внутренними кандидатами, но можно усилить развитие.
                </p>
              ) : (
                <div className="space-y-2">
                  {movesSummary.roles
                    .filter((role) => role.hireRequired)
                    .slice(0, 3)
                    .map((role) => (
                      <div
                        key={role.jobRoleId}
                        className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-600"
                      >
                        <p className="font-semibold text-brand-text">{role.jobRoleName}</p>
                        <p className="text-xs text-slate-500">Нужно нанять — нет внутренних кандидатов</p>
                      </div>
                    ))}
                </div>
              )}
              <p className="text-sm font-semibold text-brand-text">Роли с кандидатами внутри</p>
              {movesSummary.roles.filter((role) => !role.hireRequired).slice(0, 3).length === 0 ? (
                <p className="text-sm text-slate-500">Кандидаты не найдены — задайте требования ролей.</p>
              ) : (
                <div className="space-y-2">
                  {movesSummary.roles
                    .filter((role) => !role.hireRequired)
                    .slice(0, 3)
                    .map((role) => (
                      <div
                        key={`develop-${role.jobRoleId}`}
                        className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-600"
                      >
                        <p className="font-semibold text-brand-text">{role.jobRoleName}</p>
                        <p className="text-xs text-slate-500">
                          Кандидатов: {role.internalCandidatesCount} · минимальный gap:{" "}
                          {formatGapLabel(role.minGapScoreAmongCandidates)}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Недостаточно данных для рекомендаций. Запустите цикл оценки и задайте требования по ролям, чтобы получить
            подсказки по найму.
          </p>
        )}
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Артефакты</p>
            <h2 className="text-xl font-semibold text-brand-text">Последние задачи команды</h2>
            <p className="text-sm text-slate-500">Quadrant смотрит на таски, PR и документы.</p>
          </div>
        </div>
        {profile.artifacts.length === 0 ? (
          <p className="text-sm text-slate-500">Артефакты не найдены — подключите интеграции или назначьте участников.</p>
        ) : (
          <div className="space-y-3">
            {profile.artifacts.map((artifact) => (
              <div key={artifact.id} className="rounded-2xl border border-white/60 bg-white/90 p-4 text-sm text-slate-600">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-brand-text">{artifact.title}</p>
                    <p className="text-xs text-slate-500">
                      {formatArtifactType(artifact.type)} · {artifact.integration?.name ?? "Интеграция не указана"}
                    </p>
                  </div>
                  {artifact.url && (
                    <a
                      href={artifact.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-brand-primary"
                    >
                      Открыть →
                    </a>
                  )}
                </div>
                {artifact.assignees.length > 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    Участники: {artifact.assignees.map((assignee) => assignee.name).join(", ")}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-500">Обновлено {formatDate(artifact.updatedAt)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Квесты команды</p>
            <h2 className="text-xl font-semibold text-brand-text">Работа над рисками</h2>
          </div>
          <SecondaryButton href="/app/quests" className="px-4 py-2">
            Все квесты
          </SecondaryButton>
        </div>
        {teamQuests.length === 0 ? (
          <p className="text-sm text-slate-500">Для этой команды пока нет квестов.</p>
        ) : (
          <div className="space-y-3">
            {teamQuests.map((quest) => (
              <div key={quest.id} className="rounded-2xl border border-white/60 bg-white/90 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-text">{quest.title}</p>
                    <p className="text-xs text-slate-500">{quest.description}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <Tag variant="outline">{formatGoal(quest.goalType)}</Tag>
                      <Tag variant="outline">{formatStatus(quest.status)}</Tag>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{quest.steps.length} шагов</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function formatRisk(risk: TeamProfile["skills"][number]["risk"]) {
  if (risk === "high") return "Высокий";
  if (risk === "medium") return "Средний";
  return "Низкий";
}

function riskBadge(risk: TeamProfile["skills"][number]["risk"]) {
  if (risk === "high") return "bg-red-100 text-red-700";
  if (risk === "medium") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "неизвестно";
  }
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

function formatInsightKind(kind: string) {
  if (kind === "risk") return "Риск";
  if (kind === "growth") return "Рост";
  if (kind === "workload") return "Нагрузка";
  return "Комментарий";
}

function formatArtifactType(type: ArtifactType) {
  if (type === "task") return "Таск";
  if (type === "pr") return "Pull Request";
  if (type === "doc") return "Документ";
  return type;
}

function formatGoal(goal: string) {
  const map: Record<string, string> = {
    reduce_risk: "Снизить риск",
    develop_skill: "Развить навык",
    onboarding: "Онбординг",
    project_help: "Помощь проекту",
    other: "Другое",
  };
  return map[goal] ?? goal;
}

function formatStatus(status: string) {
  const map: Record<string, string> = { draft: "Черновик", active: "Активный", completed: "Завершён", archived: "Архив" };
  return map[status] ?? status;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/90 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-2xl font-semibold text-brand-text">{value}</p>
    </div>
  );
}

function formatGapLabel(value: number | null) {
  if (value === null || value === undefined) return "нет данных";
  if (value <= 3) return "низкий";
  if (value <= 7) return "средний";
  return "высокий";
}

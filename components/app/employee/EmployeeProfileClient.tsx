"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { ArtifactType } from "@/drizzle/schema";
import type { EmployeeProfile } from "@/services/types/profile";
import type { QuestAssignmentWithProgressDTO } from "@/services/types/quest";

type EmployeeProfileClientProps = {
  employeeId: string;
  initialProfile: EmployeeProfile;
  assignments?: QuestAssignmentWithProgressDTO[];
  assessmentSnapshot?: {
    cycleName: string;
    progress: number;
    finalizedSkills: number;
  } | null;
  potentialRoles?: Array<{ roleName: string; gapScore: number }>;
};

export default function EmployeeProfileClient({
  employeeId,
  initialProfile,
  assignments = [],
  assessmentSnapshot = null,
  potentialRoles = [],
}: EmployeeProfileClientProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<ArtifactType | "all">("all");
  const [skillFilter, setSkillFilter] = useState<string>("all");

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/app/employee/${employeeId}/profile`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | { ok: boolean; profile: EmployeeProfile; error?: { message?: string } }
        | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось обновить профиль сотрудника");
      }
      setProfile(payload.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  const skillOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const artifact of profile.artifacts) {
      for (const skill of artifact.skills) {
        options.set(skill.skillId, skill.name);
      }
    }
    return Array.from(options.entries());
  }, [profile.artifacts]);

  const filteredArtifacts = useMemo(() => {
    return profile.artifacts.filter((artifact) => {
      const typeMatches = typeFilter === "all" || artifact.type === typeFilter;
      if (!typeMatches) return false;
      if (skillFilter === "all") return true;
      return artifact.skills.some((skill) => skill.skillId === skillFilter);
    });
  }, [profile.artifacts, typeFilter, skillFilter]);

  const assignmentProgress = useMemo(() => assignments, [assignments]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Профиль сотрудника</p>
          <h1 className="text-3xl font-semibold text-brand-text">{profile.employee.name}</h1>
          <p className="text-base text-slate-600">
            {profile.employee.position} · {profile.employee.level}
            {profile.employee.teamName ? (
              <>
                {" "}
                · Команда{" "}
                <Link href={`/app/team/${profile.employee.teamId}`} className="font-semibold text-brand-primary">
                  {profile.employee.teamName}
                </Link>
              </>
            ) : (
              " · Без команды"
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton href="/app/team" className="px-4 py-2">
            Назад к людям
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
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Карточка сотрудника</p>
            <h2 className="text-xl font-semibold text-brand-text">Статус и метрики</h2>
            <p className="text-sm text-slate-500">Навыки, артефакты и риски по человеку.</p>
          </div>
          {profile.stats.isSinglePoint && <Tag variant="outline">Ключевой владелец навыков</Tag>}
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {[
            { label: "Навыков всего", value: profile.stats.totalSkills },
            { label: "Ключевых навыков", value: profile.stats.keySkills },
            { label: "Поддерживающих", value: profile.stats.supportingSkills },
            { label: "Артефактов", value: profile.stats.artifactCount },
            { label: "За 30 дней", value: profile.stats.recentArtifacts },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/60 bg-white/90 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">{item.label}</p>
              <p className="text-2xl font-semibold text-brand-text">{item.value}</p>
            </div>
          ))}
        </div>
        {!profile.stats.totalSkills && (
          <p className="rounded-2xl border border-dashed border-brand-border/60 p-4 text-sm text-slate-500">
            Quadrant знает слишком мало о навыках этого сотрудника. Добавьте оценки по ключевым компетенциям.
          </p>
        )}
        {!profile.stats.artifactCount && (
          <p className="rounded-2xl border border-dashed border-brand-border/60 p-4 text-sm text-slate-500">
            У сотрудника нет артефактов — подключите интеграции или укажите участие в задачах.
          </p>
        )}
      </Card>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Навыки</p>
            <h2 className="text-xl font-semibold text-brand-text">Уровни и подтверждения</h2>
            <p className="text-sm text-slate-500">Артефакты, подтверждающие владение навыком.</p>
          </div>
          {profile.skills.length === 0 ? (
            <p className="text-sm text-slate-500">Навыки ещё не назначены.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Навык</th>
                    <th className="px-3 py-2">Тип</th>
                    <th className="px-3 py-2">Уровень</th>
                    <th className="px-3 py-2 text-right">Артефактов</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60">
                  {profile.skills.map((skill) => (
                    <tr key={skill.skillId}>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-brand-text">{skill.name}</p>
                        {skill.isKey && <span className="text-xs text-brand-primary">Ключевой навык</span>}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{formatSkillType(skill.type)}</td>
                      <td className="px-3 py-3 text-slate-600">{skill.level}/5</td>
                      <td className="px-3 py-3 text-right text-slate-600">{skill.artifactCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Рекомендации</p>
            <h2 className="text-xl font-semibold text-brand-text">Что делать HR/лиду</h2>
            <p className="text-sm text-slate-500">Инсайты Quadrant с учётом рисков и роста.</p>
          </div>
          {profile.insights.length === 0 ? (
            <p className="text-sm text-slate-500">Добавьте больше данных о задачах и навыках, чтобы увидеть рекомендации.</p>
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

      {assessmentSnapshot && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Оценки</p>
              <h2 className="text-xl font-semibold text-brand-text">{assessmentSnapshot.cycleName}</h2>
            </div>
            <Tag variant="outline">Прогресс: {assessmentSnapshot.progress}%</Tag>
          </div>
          <p className="text-sm text-slate-600">Финализированных навыков: {assessmentSnapshot.finalizedSkills}</p>
        </Card>
      )}

      {potentialRoles.length > 0 && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Потенциал по ролям</p>
              <h2 className="text-xl font-semibold text-brand-text">Ближайшие роли</h2>
            </div>
            <SecondaryButton href="/app/moves" className="px-4 py-2">
              Открыть решения
            </SecondaryButton>
          </div>
          <div className="space-y-2">
            {potentialRoles.map((item) => (
              <div key={item.roleName} className="rounded-2xl border border-brand-border/60 bg-white/90 p-3 text-sm text-slate-600">
                <p className="font-semibold text-brand-text">{item.roleName}</p>
                <p className="text-xs text-slate-500">Гэп: {formatGapLabel(item.gapScore)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Квесты</p>
            <h2 className="text-xl font-semibold text-brand-text">Развитие сотрудника</h2>
          </div>
          <SecondaryButton href="/app/quests" className="px-4 py-2">
            Настроить квесты
          </SecondaryButton>
        </div>
        {assignmentProgress.length === 0 ? (
          <p className="text-sm text-slate-500">Для сотрудника пока нет квестов.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {assignmentProgress.map((assignment) => (
              <div key={assignment.id} className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-600">
                <p className="font-semibold text-brand-text">{assignment.quest?.title ?? "Квест"}</p>
                <p className="text-xs text-slate-500">{formatGoal(assignment.quest?.goalType ?? "")}</p>
                <p className="text-xs text-slate-500">Статус: {formatStatus(assignment.status)}</p>
                <p className="text-xs text-slate-500">
                  Прогресс: {computeProgress(assignment)}%
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Артефакты</p>
            <h2 className="text-xl font-semibold text-brand-text">Последние задачи</h2>
            <p className="text-sm text-slate-500">Можно отфильтровать по типу или навыку.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <select
              className="rounded-xl border border-brand-border px-3 py-2"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as ArtifactType | "all")}
            >
              <option value="all">Все типы</option>
              <option value="task">Таски</option>
              <option value="pr">PR</option>
              <option value="doc">Документы</option>
            </select>
            <select
              className="rounded-xl border border-brand-border px-3 py-2"
              value={skillFilter}
              onChange={(event) => setSkillFilter(event.target.value)}
            >
              <option value="all">Все навыки</option>
              {skillOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {filteredArtifacts.length === 0 ? (
          <p className="text-sm text-slate-500">Артефакты не найдены под выбранные фильтры.</p>
        ) : (
          <div className="space-y-3">
            {filteredArtifacts.map((artifact) => (
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
                {artifact.skills.length > 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    Навыки: {artifact.skills.map((skill) => skill.name).join(", ")}
                  </p>
                )}
                {artifact.assignees.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    Роли: {artifact.assignees.map((assignee) => `${assignee.name} (${assignee.role})`).join(", ")}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-500">Обновлено {formatDate(artifact.updatedAt)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Мобильность</p>
            <h2 className="text-xl font-semibold text-brand-text">Кого можно подменить</h2>
            <p className="text-sm text-slate-500">Quadrant подбирает замен с учётом навыков.</p>
          </div>
          {profile.replacements.length === 0 ? (
            <p className="text-sm text-slate-500">Пока нет кандидатов на замену.</p>
          ) : (
            <div className="space-y-3">
              {profile.replacements.map((candidate) => (
                <div key={candidate.employeeId} className="rounded-2xl border border-white/60 bg-white/90 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-brand-text">{candidate.name}</p>
                      <p className="text-xs text-slate-500">{candidate.position}</p>
                    </div>
                    <span className="text-sm font-semibold text-brand-primary">
                      Сходство {candidate.similarityScore}%
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Совпадающие навыки:{" "}
                    {candidate.sharedSkills.length > 0
                      ? candidate.sharedSkills.map((skill) => `${skill.name} (${skill.level}/5)`).join(", ")
                      : "нет прямых совпадений"}
                  </p>
                  {candidate.missingSkills.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      Нужно подтянуть: {candidate.missingSkills.map((skill) => skill.name).join(", ")}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    Статус: {candidate.readiness === "ready" ? "готов заменить" : "stretch-задача"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Рост</p>
            <h2 className="text-xl font-semibold text-brand-text">Как развивать</h2>
            <p className="text-sm text-slate-500">Целевые роли и недостающие навыки.</p>
          </div>
          {profile.growth.length === 0 ? (
            <p className="text-sm text-slate-500">Добавьте больше оценок по навыкам, чтобы увидеть траекторию роста.</p>
          ) : (
            <div className="space-y-3">
              {profile.growth.map((path) => (
                <div key={path.targetRoleId} className="rounded-2xl border border-white/60 bg-white/90 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-brand-text">{path.targetRoleName}</p>
                      <p className="text-xs text-slate-500">Готовность {(path.readinessScore * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">Что подтянуть</p>
                  {path.missingSkills.length === 0 ? (
                    <p className="text-sm text-slate-500">Навыки уже соответствуют требованиям.</p>
                  ) : (
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-600">
                      {path.missingSkills.map((skill) => (
                        <li key={`${path.targetRoleId}-${skill.name}`}>
                          {skill.name} · до уровня {skill.targetLevel}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {profile.riskProfile && (
        <Card className="space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Риски</p>
              <h2 className="text-xl font-semibold text-brand-text">Навыки без дублёров</h2>
              <p className="text-sm text-slate-500">Используйте эти данные для передачи знаний.</p>
            </div>
            <Tag variant="outline">Risk-score: {profile.riskProfile.riskScore}</Tag>
          </div>
          {profile.riskProfile.criticalSkills.length === 0 ? (
            <p className="text-sm text-slate-500">Критичных рисков нет.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {profile.riskProfile.criticalSkills.map((risk) => (
                <div key={risk.id} className="rounded-2xl border border-white/60 bg-white/90 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-brand-text">{risk.title}</p>
                  <p className="mt-1 text-xs">{risk.description}</p>
                </div>
              ))}
            </div>
          )}
          <SecondaryButton href="/app/analytics/staffing" className="px-4 py-2">
            Перейти к подбору команды
          </SecondaryButton>
        </Card>
      )}
    </div>
  );
}

function formatArtifactType(type: ArtifactType) {
  if (type === "task") return "Таск";
  if (type === "pr") return "Pull Request";
  if (type === "doc") return "Документ";
  return type;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "неизвестно";
  }
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

function formatSkillType(type: string) {
  if (type === "hard") return "Hard skill";
  if (type === "soft") return "Soft skill";
  if (type === "product") return "Product";
  if (type === "data") return "Data";
  return type;
}

function formatInsightKind(kind: string) {
  if (kind === "risk") return "Риск";
  if (kind === "growth") return "Рост";
  if (kind === "workload") return "Нагрузка";
  return "Комментарий";
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
  const map: Record<string, string> = {
    invited: "Приглашение",
    in_progress: "В процессе",
    completed: "Завершён",
    dropped: "Остановлен",
  };
  return map[status] ?? status;
}

function computeProgress(assignment: QuestAssignmentWithProgressDTO) {
  const total = assignment.steps.length || 1;
  const done = assignment.steps.filter((step) => step.status === "done").length;
  return Math.round((done / total) * 100);
}

function formatGapLabel(score: number) {
  if (score <= 3) return "Низкий";
  if (score <= 7) return "Средний";
  return "Высокий";
}

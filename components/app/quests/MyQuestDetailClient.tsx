"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { QuestAssignmentWithProgressDTO } from "@/services/types/quest";

type MyQuestDetailClientProps = {
  assignmentId: string;
};

export default function MyQuestDetailClient({ assignmentId }: MyQuestDetailClientProps) {
  const [assignment, setAssignment] = useState<QuestAssignmentWithProgressDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/app/quests/assignments/me", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось загрузить квест");
      }
      const found = (payload.assignments as QuestAssignmentWithProgressDTO[]).find((item) => item.id === assignmentId);
      setAssignment(found ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  const quest = assignment?.quest;
  const progress = useMemo(() => computeProgress(assignment), [assignment]);

  const handleStepUpdate = async (stepId: string, status: "not_started" | "in_progress" | "done") => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/app/quests/steps/progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questAssignmentId: assignmentId, stepId, status }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось обновить шаг");
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <Card className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>}
      {loading && !assignment && <p className="text-sm text-slate-500">Загружаем квест…</p>}
      {assignment && quest && (
        <>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Квест</p>
              <h1 className="text-3xl font-semibold text-brand-text">{quest.title}</h1>
              <p className="text-sm text-slate-600">{quest.description}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                <Tag variant="outline">{formatGoal(quest.goalType)}</Tag>
                <Tag variant="outline">{formatPriority(quest.priority)}</Tag>
                <Tag variant="outline">{formatStatus(assignment.status)}</Tag>
              </div>
            </div>
            <div className="text-right text-sm text-slate-600">
              <p>Прогресс: {progress}%</p>
              <SecondaryButton href="/app/my/quests" className="px-4 py-2">
                К списку
              </SecondaryButton>
            </div>
          </div>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-brand-text">Шаги</h2>
              <span className="text-sm text-slate-500">{quest.steps.length}</span>
            </div>
            <div className="space-y-3">
              {quest.steps.map((step) => {
                const progressStep = assignment.steps.find((item) => item.stepId === step.id);
                const status = progressStep?.status ?? "not_started";
                return (
                  <div key={step.id} className="rounded-2xl border border-brand-border/60 bg-white/90 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-brand-text">{step.title}</p>
                        <p className="text-sm text-slate-600">{step.description}</p>
                        {step.relatedSkillId && (
                          <p className="text-xs text-slate-500">Связанный навык: {step.relatedSkillId}</p>
                        )}
                        {step.suggestedArtifactsCount ? (
                          <p className="text-xs text-slate-500">
                            Ожидается артефактов: {step.suggestedArtifactsCount}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-2 text-xs">
                        <Tag variant="outline">{statusLabel(status)}</Tag>
                        <div className="flex gap-2">
                          <PrimaryButton onClick={() => void handleStepUpdate(step.id, "done")} className="px-3 py-1 text-xs">
                            Готово
                          </PrimaryButton>
                          <SecondaryButton onClick={() => void handleStepUpdate(step.id, "in_progress")} className="px-3 py-1 text-xs">
                            В работе
                          </SecondaryButton>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function computeProgress(assignment: QuestAssignmentWithProgressDTO | null) {
  if (!assignment) return 0;
  const total = assignment.steps.length || 1;
  const done = assignment.steps.filter((step) => step.status === "done").length;
  return Math.round((done / total) * 100);
}

function statusLabel(value: string) {
  const map: Record<string, string> = {
    not_started: "Не начато",
    in_progress: "В работе",
    done: "Готово",
  };
  return map[value] ?? value;
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

function formatPriority(priority: string) {
  const map: Record<string, string> = { low: "Низкий", medium: "Средний", high: "Высокий" };
  return map[priority] ?? priority;
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

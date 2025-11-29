"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Card from "@/components/common/Card";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { QuestAssignmentWithProgressDTO } from "@/services/types/quest";

type MyQuestsClientProps = {
  initialAssignments?: QuestAssignmentWithProgressDTO[];
};

export default function MyQuestsClient({ initialAssignments = [] }: MyQuestsClientProps) {
  const [assignments, setAssignments] = useState<QuestAssignmentWithProgressDTO[]>(initialAssignments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialAssignments.length === 0) {
      void loadAssignments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/app/quests/assignments/me", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось загрузить квесты");
      }
      setAssignments(payload.assignments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo(() => {
    const byStatus: Record<string, QuestAssignmentWithProgressDTO[]> = {
      in_progress: [],
      completed: [],
      invited: [],
      dropped: [],
    };
    for (const assignment of assignments) {
      byStatus[assignment.status] = byStatus[assignment.status] ?? [];
      byStatus[assignment.status].push(assignment);
    }
    return byStatus;
  }, [assignments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Моё развитие</p>
          <h1 className="text-3xl font-semibold text-brand-text">Мои квесты</h1>
          <p className="text-sm text-slate-600">Следите за шагами, отмечайте выполненное и ищите менторов.</p>
        </div>
        <SecondaryButton onClick={() => void loadAssignments()} disabled={loading} className="px-4 py-2">
          Обновить
        </SecondaryButton>
      </div>

      {error && (
        <Card className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </Card>
      )}

      {loading && assignments.length === 0 && <p className="text-sm text-slate-500">Загружаем ваши квесты…</p>}

      <QuestGroup title="В процессе" items={grouped.in_progress} />
      <QuestGroup title="Приглашения" items={grouped.invited} />
      <QuestGroup title="Завершённые" items={grouped.completed} />
    </div>
  );
}

function QuestGroup({ title, items }: { title: string; items: QuestAssignmentWithProgressDTO[] }) {
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-text">{title}</h2>
        <span className="text-sm text-slate-500">{items?.length ?? 0}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Пока пусто.</p>
      ) : (
        <div className="space-y-3">
          {items.map((assignment) => {
            const quest = assignment.quest;
            const progress = computeProgress(assignment);
            return (
              <div key={assignment.id} className="rounded-2xl border border-white/60 bg-white/90 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-brand-text">{quest?.title ?? "Квест"}</p>
                    <p className="text-xs text-slate-500">{quest?.description}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <Tag variant="outline">{formatGoal(quest?.goalType ?? "")}</Tag>
                      <Tag variant="outline">Статус: {formatStatus(assignment.status)}</Tag>
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-600">
                    <p>Прогресс: {progress}%</p>
                    <Link href={`/app/my/quests/${assignment.id}`} className="text-sm font-semibold text-brand-primary">
                      Открыть квест →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function computeProgress(assignment: QuestAssignmentWithProgressDTO) {
  const total = assignment.steps.length || 1;
  const done = assignment.steps.filter((step) => step.status === "done").length;
  return Math.round((done / total) * 100);
}

function formatGoal(goal: string) {
  const map: Record<string, string> = {
    reduce_risk: "Снизить риск",
    develop_skill: "Развить навык",
    onboarding: "Онбординг",
    project_help: "Помощь проекту",
    other: "Другое",
  };
  return map[goal] ?? "Цель не указана";
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

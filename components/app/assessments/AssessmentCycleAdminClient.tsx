"use client";

import Link from "next/link";
import Card from "@/components/common/Card";
import SecondaryButton from "@/components/common/SecondaryButton";
import type { AssessmentCycleDTO, WorkspaceAssessmentSummaryDTO } from "@/services/types/assessment";

type AssessmentCycleAdminClientProps = {
  cycle: AssessmentCycleDTO;
  summary: WorkspaceAssessmentSummaryDTO | null;
};

export default function AssessmentCycleAdminClient({ cycle, summary }: AssessmentCycleAdminClientProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Цикл оценок</p>
          <h1 className="text-3xl font-semibold text-brand-text">{cycle.name}</h1>
          <p className="text-sm text-slate-600">{cycle.description}</p>
          <div className="mt-2 text-xs text-slate-500">
            Период: {cycle.startsAt ?? "—"} — {cycle.endsAt ?? "—"} · Статус: {formatStatus(cycle.status)}
          </div>
        </div>
        <div className="flex gap-2">
          <SecondaryButton href="/app/assessments" className="px-4 py-2">
            К циклам
          </SecondaryButton>
          <SecondaryButton href={`/app/assessments/${cycle.id}/manager`} className="px-4 py-2">
            Кабинет менеджера
          </SecondaryButton>
        </div>
      </div>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-brand-text">Прогресс по workspace</h2>
        {summary ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 text-sm text-slate-600">
            <div className="rounded-2xl border border-brand-border/60 bg-white/80 p-3">
              <p className="text-xs uppercase text-slate-400">Участников</p>
              <p className="text-2xl font-semibold text-brand-text">{summary.participants}</p>
            </div>
            <div className="rounded-2xl border border-brand-border/60 bg-white/80 p-3">
              <p className="text-xs uppercase text-slate-400">Финализировано</p>
              <p className="text-2xl font-semibold text-brand-text">{summary.finalizedPercent}%</p>
            </div>
            <div className="rounded-2xl border border-brand-border/60 bg-white/80 p-3">
              <p className="text-xs uppercase text-slate-400">Средний gap</p>
              <p className="text-2xl font-semibold text-brand-text">{summary.averageGap}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Данных по прогрессу пока нет.</p>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-brand-text">Команды</h3>
          <span className="text-xs text-slate-500">{cycle.teamIds.length} шт.</span>
        </div>
        {summary?.teams?.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {summary.teams.map((team) => (
              <div key={team.teamId} className="rounded-2xl border border-brand-border/60 bg-white/80 p-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <Link href={`/app/team/${team.teamId}`} className="font-semibold text-brand-primary">
                    {team.teamName}
                  </Link>
                  <span className="text-xs text-slate-500">Gap: {team.averageGap}</span>
                </div>
                <p className="text-xs text-slate-500">Самооценка: {team.selfSubmittedPercent}%</p>
                <p className="text-xs text-slate-500">Финал: {team.finalizedPercent}%</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Команды ещё не запущены в этом цикле.</p>
        )}
      </Card>
    </div>
  );
}

function formatStatus(status: string) {
  const map: Record<string, string> = {
    draft: "Черновик",
    active: "Активен",
    closed: "Закрыт",
    archived: "Архив",
  };
  return map[status] ?? status;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/common/Card";
import SecondaryButton from "@/components/common/SecondaryButton";
import PrimaryButton from "@/components/common/PrimaryButton";
import Tag from "@/components/common/Tag";
import type { ManagerAgendaSnapshot } from "@/services/managerAgendaService";
import type { ActionItem } from "@/services/types/actionCenter";

type AgendaResponse = { ok: boolean; snapshot: ManagerAgendaSnapshot };

export default function ManagerAgendaClient() {
  const [snapshot, setSnapshot] = useState<ManagerAgendaSnapshot | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [agendaResp, actionsResp] = await Promise.all([
        fetch("/api/app/manager/agenda", { cache: "no-store" }),
        fetch("/api/app/action-center", { cache: "no-store" }),
      ]);
      const agendaJson = (await agendaResp.json().catch(() => null)) as AgendaResponse | null;
      if (!agendaResp.ok || !agendaJson?.ok) throw new Error(agendaJson?.error?.message ?? "Не удалось загрузить данные");
      setSnapshot(agendaJson.snapshot);
      const actionsJson = (await actionsResp.json().catch(() => null)) as { ok?: boolean; items?: ActionItem[] } | null;
      if (actionsResp.ok && actionsJson?.ok && Array.isArray(actionsJson.items)) {
        const withDue = actionsJson.items
          .filter((a) => !a.dueDate || new Date(a.dueDate) <= addDays(new Date(), 7))
          .sort((a, b) => {
            if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            return 0;
          });
        setActions(withDue.slice(0, 8));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const periodLabel = useMemo(() => {
    if (!snapshot) return "";
    const start = new Date(snapshot.period.start);
    const end = new Date(snapshot.period.end);
    return `${start.toLocaleDateString("ru-RU")} — ${end.toLocaleDateString("ru-RU")}`;
  }, [snapshot]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Manager Agenda</p>
          <h1 className="text-3xl font-semibold text-brand-text">Рабочий стол менеджера</h1>
          <p className="text-sm text-slate-600">Что важно сделать с командой на этой неделе ({periodLabel}).</p>
        </div>
        <div className="flex gap-2">
          <SecondaryButton href="/app/manager" className="px-3 py-2 text-xs">
            Командный центр
          </SecondaryButton>
          <PrimaryButton onClick={() => void load()} className="px-3 py-2 text-xs">
            Обновить
          </PrimaryButton>
        </div>
      </div>

      {error && <Card className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>}
      {loading && !snapshot && <Card className="p-3 text-sm text-slate-500">Загружаем данные…</Card>}

      {snapshot && (
        <>
          <Card className="grid gap-3 md:grid-cols-4">
            {renderStat("Размер команды", snapshot.team.teamSize)}
            {renderStat("Без 1:1 за 30д", snapshot.team.employeesWithoutRecent1on1)}
            {renderStat("Без целей", snapshot.team.employeesWithoutGoals)}
            {renderStat("Просроченные цели", snapshot.goals.activeGoals.filter((g) => g.status === "overdue").length)}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">1:1</p>
                  <h2 className="text-xl font-semibold text-brand-text">Встречи на неделю</h2>
                </div>
                <SecondaryButton href="/app/one-on-ones" className="px-3 py-1 text-xs">
                  Планирование
                </SecondaryButton>
              </div>
              {snapshot.upcomingOneOnOnes.length === 0 ? (
                <p className="text-sm text-slate-500">Нет запланированных 1:1 на эту неделю.</p>
              ) : (
                <div className="space-y-2">
                  {snapshot.upcomingOneOnOnes.map((m) => (
                    <div key={m.id} className="rounded-2xl border border-white/70 bg-white/90 p-3 text-sm text-slate-700">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-brand-text">{new Date(m.scheduledAt).toLocaleString("ru-RU")}</p>
                        <Link href={`/app/one-on-ones/${m.id}`} className="text-xs font-semibold text-brand-primary">
                          Открыть →
                        </Link>
                      </div>
                      <p className="text-xs text-slate-500">С {m.employeeName}</p>
                    </div>
                  ))}
                </div>
              )}
              {snapshot.overdueOneOnOnes.length > 0 && (
                <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <p className="font-semibold">Просроченные 1:1</p>
                  {snapshot.overdueOneOnOnes.map((m) => (
                    <p key={m.id} className="text-xs">
                      {m.employeeName}: {new Date(m.scheduledAt).toLocaleDateString("ru-RU")} (задержка {m.daysOverdue} дн.)
                    </p>
                  ))}
                </div>
              )}
            </Card>

            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Цели команды</p>
                  <h2 className="text-xl font-semibold text-brand-text">Активные цели</h2>
                </div>
                <SecondaryButton href="/app/development-goals" className="px-3 py-1 text-xs">
                  Все цели
                </SecondaryButton>
              </div>
              {snapshot.goals.activeGoals.length === 0 ? (
                <p className="text-sm text-slate-500">Нет активных целей у команды.</p>
              ) : (
                <div className="space-y-2">
                  {snapshot.goals.activeGoals.map((g) => (
                    <div key={g.id} className="rounded-2xl border border-white/70 bg-white/90 p-3 text-sm text-slate-700">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-brand-text">{g.title}</p>
                        <Tag variant={g.status === "overdue" ? "danger" : "outline"}>{g.status === "overdue" ? "Просрочено" : "Активна"}</Tag>
                      </div>
                      <p className="text-xs text-slate-500">{g.employeeName}</p>
                      {g.targetDate && <p className="text-[11px] text-slate-400">до {new Date(g.targetDate).toLocaleDateString("ru-RU")}</p>}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-500">
                Закрыто целей за 30д: {snapshot.goals.completedLast30d.length}
              </p>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Навыки и пробелы</p>
                  <h2 className="text-xl font-semibold text-brand-text">Критичные навыки</h2>
                </div>
                <SecondaryButton href="/app/skills" className="px-3 py-1 text-xs">
                  Матрица навыков
                </SecondaryButton>
              </div>
              {snapshot.skillGaps.criticalSkills.length === 0 ? (
                <p className="text-sm text-slate-500">Нет данных или нет критичных навыков.</p>
              ) : (
                <div className="space-y-2">
                  {snapshot.skillGaps.criticalSkills.map((s) => (
                    <div key={s.skillId} className="rounded-2xl border border-white/70 bg-white/90 p-3 text-sm text-slate-700">
                      <p className="font-semibold text-brand-text">{s.skillName}</p>
                      <p className="text-xs text-slate-500">Gap: {s.avgGap.toFixed(2)} · Людей затронуто: {s.affectedEmployees}</p>
                    </div>
                  ))}
                </div>
              )}
              {snapshot.skillGaps.employeesWithHighGap.length > 0 && (
                <div className="space-y-1 text-xs text-slate-600">
                  <p className="font-semibold text-brand-text">С кем обсудить</p>
                  {snapshot.skillGaps.employeesWithHighGap.map((e) => (
                    <p key={e.employeeId}>
                      {e.employeeName}: {e.topSkillName} (gap {e.gap.toFixed(2)})
                    </p>
                  ))}
                </div>
              )}
            </Card>

            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Опросы</p>
                  <h2 className="text-xl font-semibold text-brand-text">Вовлечённость и обратная связь</h2>
                </div>
                <SecondaryButton href="/app/feedback/surveys" className="px-3 py-1 text-xs">
                  Открыть опросы
                </SecondaryButton>
              </div>
              {snapshot.feedback.activeSurveysForTeam.length === 0 ? (
                <p className="text-sm text-slate-500">Нет активных опросов для команды.</p>
              ) : (
                <div className="space-y-2">
                  {snapshot.feedback.activeSurveysForTeam.map((s) => (
                    <div key={s.surveyId} className="rounded-2xl border border-white/70 bg-white/90 p-3 text-sm text-slate-700">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-brand-text">{s.title}</p>
                        {s.dueDate && <span className="text-xs text-slate-500">до {new Date(s.dueDate).toLocaleDateString("ru-RU")}</span>}
                      </div>
                      <p className="text-xs text-slate-500">Response rate: {s.responseRate ?? "—"}%</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Программы и пилоты</p>
                  <h2 className="text-xl font-semibold text-brand-text">Развитие команды</h2>
                </div>
                <SecondaryButton href="/app/programs" className="px-3 py-1 text-xs">
                  Все программы
                </SecondaryButton>
              </div>
              {snapshot.programs.activeProgramsForTeam.length === 0 ? (
                <p className="text-sm text-slate-500">Нет активных программ для команды.</p>
              ) : (
                <div className="space-y-2">
                  {snapshot.programs.activeProgramsForTeam.map((p) => (
                    <div key={p.id} className="rounded-2xl border border-white/70 bg-white/90 p-3 text-sm text-slate-700">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-brand-text">{p.name}</p>
                        <Tag variant="outline">Участников: {p.participantsCount}</Tag>
                      </div>
                      <Link href={`/app/programs/${p.id}`} className="text-xs font-semibold text-brand-primary">
                        Открыть →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
              {snapshot.programs.suggestedProgramsByGap.length > 0 && (
                <div className="space-y-2 rounded-2xl border border-white/70 bg-white/90 p-3 text-sm text-slate-700">
                  <p className="font-semibold text-brand-text">Предложения по gap</p>
                  {snapshot.programs.suggestedProgramsByGap.map((s, idx) => (
                    <p key={`${s.skillId}-${idx}`} className="text-xs text-slate-600">
                      Навык {s.skillName}: рассмотреть программу {s.programName ?? "Quadrant"} для {s.affectedEmployees} сотрудников.
                    </p>
                  ))}
                </div>
              )}
            </Card>

            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Действия</p>
                  <h2 className="text-xl font-semibold text-brand-text">Action Center</h2>
                </div>
                <SecondaryButton href="/app/manager" className="px-3 py-1 text-xs">
                  Менеджер
                </SecondaryButton>
              </div>
              {actions.length === 0 ? (
                <p className="text-sm text-slate-500">Нет срочных действий на эту неделю.</p>
              ) : (
                <div className="space-y-2">
                  {actions.map((a) => (
                    <div key={a.id} className="rounded-2xl border border-white/70 bg-white/90 p-3 text-sm text-slate-700">
                      <div className="flex items-center justify-between gap-2">
                        <Tag variant="outline">{mapActionType(a.type)}</Tag>
                        <Link href={a.link} className="text-xs font-semibold text-brand-primary">
                          Перейти →
                        </Link>
                      </div>
                      <p className="mt-1 font-semibold text-brand-text">{a.title}</p>
                      <p className="text-xs text-slate-500">{a.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function renderStat(label: string, value: number | string) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-brand-text">{value}</p>
    </div>
  );
}

function mapActionType(type: ActionItem["type"]) {
  switch (type) {
    case "run_1_1":
      return "1:1";
    case "create_goal":
      return "Цели";
    case "close_program":
      return "Программы";
    case "fill_program_outcome":
      return "Итоги";
    case "answer_survey":
      return "Опросы";
    default:
      return "Действие";
  }
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}


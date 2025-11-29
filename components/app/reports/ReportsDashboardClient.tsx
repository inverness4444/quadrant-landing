"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { ReportDTO } from "@/services/types/report";
import type { MeetingAgendaDTO } from "@/services/types/meeting";

type ReportsDashboardClientProps = {
  workspaceName: string;
  reports: ReportDTO[];
  agendas: MeetingAgendaDTO[];
  teams: Array<{ id: string; name: string }>;
  pilots: Array<{ id: string; name: string }>;
};

export default function ReportsDashboardClient({ workspaceName, reports: initialReports, agendas: initialAgendas, teams, pilots }: ReportsDashboardClientProps) {
  const router = useRouter();
  const [reports, setReports] = useState(initialReports);
  const [agendas, setAgendas] = useState(initialAgendas);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{ type: "team" | "pilot" | "workspace"; title: string; teamId?: string; pilotRunId?: string; autoGenerate: boolean }>({
    type: "team",
    title: "",
    teamId: undefined,
    pilotRunId: undefined,
    autoGenerate: true,
  });

  const refresh = async () => {
    try {
      const resp = await fetch("/api/app/reports", { cache: "no-store" });
      const payload = await resp.json().catch(() => null);
      if (resp.ok && payload?.ok) {
        setReports(payload.reports ?? []);
      }
      const agendaResp = await fetch("/api/app/meetings/agendas", { cache: "no-store" });
      const agendaJson = await agendaResp.json().catch(() => null);
      if (agendaResp.ok && agendaJson?.ok) {
        setAgendas(agendaJson.agendas ?? []);
      }
    } catch (err) {
      void err;
    }
  };

  const createReport = async () => {
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/app/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось создать отчёт");
      }
      await refresh();
      router.push(`/app/reports/${payload.report.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setCreating(false);
    }
  };

  const filledPercent = (report: ReportDTO) => {
    if (report.sections.length === 0) return 0;
    const filled = report.sections.filter((s) => s.contentMarkdown.trim().length > 0).length;
    return Math.round((filled / report.sections.length) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Отчёты и встречи</p>
          <h1 className="text-3xl font-semibold text-brand-text">Отчёты и встречи для workspace «{workspaceName}»</h1>
          <p className="text-sm text-slate-600">Соберите материалы для митингов за пару кликов: отчёты и готовые agenda.</p>
        </div>
        <PrimaryButton onClick={() => setCreating(true)} className="px-4 py-2">
          Создать отчёт
        </PrimaryButton>
      </div>

      {error && <Card className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Отчёты</p>
              <h2 className="text-xl font-semibold text-brand-text">Краткие обзоры</h2>
            </div>
            <SecondaryButton onClick={() => void refresh()} className="px-3 py-1 text-xs">
              Обновить
            </SecondaryButton>
          </div>
          {reports.length === 0 ? (
            <p className="text-sm text-slate-500">Отчётов пока нет. Создайте отчёт по команде или пилоту.</p>
          ) : (
            <div className="space-y-2">
              {reports.map((report) => (
                <div key={report.id} className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-text">{report.title}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                        <Tag variant="outline">{formatType(report.type)}</Tag>
                        <Tag variant="outline">Статус: {formatStatus(report.status)}</Tag>
                        {report.teamId && <Tag variant="outline">Команда</Tag>}
                        {report.pilotRunId && <Tag variant="outline">Пилот</Tag>}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>Заполнено: {filledPercent(report)}%</p>
                      <PrimaryButton href={`/app/reports/${report.id}`} className="mt-2 px-3 py-1 text-xs">
                        Открыть
                      </PrimaryButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Встречи</p>
              <h2 className="text-xl font-semibold text-brand-text">Agenda встреч</h2>
            </div>
            <SecondaryButton onClick={() => void refresh()} className="px-3 py-1 text-xs">
              Обновить
            </SecondaryButton>
          </div>
          {agendas.length === 0 ? (
            <p className="text-sm text-slate-500">Пока нет повесток. Создайте отчёт и соберите agenda.</p>
          ) : (
            <div className="space-y-2">
              {agendas.map((agenda) => (
                <div key={agenda.id} className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-text">{agenda.title}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                        <Tag variant="outline">{formatMeetingType(agenda.type)}</Tag>
                        {agenda.reportId && <Tag variant="outline">Отчёт связан</Tag>}
                        {agenda.scheduledAt && <Tag variant="outline">Когда: {new Date(agenda.scheduledAt).toLocaleString("ru-RU")}</Tag>}
                      </div>
                    </div>
                    <SecondaryButton href={`/app/meetings/${agenda.id}`} className="px-3 py-1 text-xs">
                      Открыть
                    </SecondaryButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {creating && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-brand-text">Создать отчёт</h3>
            <SecondaryButton onClick={() => setCreating(false)} className="px-3 py-1 text-xs">
              Закрыть
            </SecondaryButton>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              Тип
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, type: event.target.value as typeof prev.type, teamId: undefined, pilotRunId: undefined }))
                }
                className="mt-1 w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
              >
                <option value="team">Команда</option>
                <option value="pilot">Пилот</option>
                <option value="workspace">Организация</option>
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Заголовок
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
                placeholder="Отчёт..."
              />
            </label>
          </div>
          {form.type === "team" && (
            <label className="text-sm text-slate-600">
              Команда
              <select
                value={form.teamId ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, teamId: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
              >
                <option value="">Выберите команду</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {form.type === "pilot" && (
            <label className="text-sm text-slate-600">
              Пилот
              <select
                value={form.pilotRunId ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, pilotRunId: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
              >
                <option value="">Выберите пилот</option>
                {pilots.map((pilot) => (
                  <option key={pilot.id} value={pilot.id}>
                    {pilot.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.autoGenerate}
              onChange={(event) => setForm((prev) => ({ ...prev, autoGenerate: event.target.checked }))}
            />
            Сгенерировать автоматически
          </label>
          <div className="flex gap-2">
            <PrimaryButton onClick={() => void createReport()} disabled={!form.title} className="px-4 py-2">
              Создать
            </PrimaryButton>
            <SecondaryButton onClick={() => setCreating(false)} className="px-4 py-2">
              Отмена
            </SecondaryButton>
          </div>
        </Card>
      )}
    </div>
  );
}

function formatType(type: string) {
  const map: Record<string, string> = { team: "Команда", pilot: "Пилот", workspace: "Организация" };
  return map[type] ?? type;
}

function formatStatus(status: string) {
  const map: Record<string, string> = { draft: "Черновик", finalized: "Финализировано", archived: "Архив" };
  return map[status] ?? status;
}

function formatMeetingType(type: string) {
  const map: Record<string, string> = {
    team_review: "Командная встреча",
    pilot_review: "Обзор пилота",
    exec_briefing: "Executive briefing",
  };
  return map[type] ?? type;
}

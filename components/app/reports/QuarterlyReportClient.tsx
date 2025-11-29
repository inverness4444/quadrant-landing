"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { QuarterlyReportDTO, QuarterlyReportSummary } from "@/services/quarterlyReportService";
import type { QuarterlyReportPayload } from "@/drizzle/schema";

const currentYear = new Date().getUTCFullYear();
const currentQuarter = Math.floor(new Date().getUTCMonth() / 3) + 1;

export default function QuarterlyReportClient() {
  const [year, setYear] = useState<number>(currentYear);
  const [quarter, setQuarter] = useState<number>(currentQuarter);
  const [report, setReport] = useState<QuarterlyReportDTO | null>(null);
  const [summary, setSummary] = useState<QuarterlyReportSummary | null>(null);
  const [payload, setPayload] = useState<QuarterlyReportPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const quarterRange = useMemo(() => {
    const startMonth = (quarter - 1) * 3;
    const start = new Date(Date.UTC(year, startMonth, 1));
    const end = new Date(Date.UTC(year, startMonth + 3, 0));
    return { since: start.toISOString(), until: end.toISOString() };
  }, [quarter, year]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, quarter]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ year: String(year), quarter: String(quarter) });
      const response = await fetch(`/api/app/reports/quarterly?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось загрузить квартальный отчёт");
      }
      setReport(payload.report);
      setSummary(payload.summary ?? payload.report);
      setPayload(payload.payload ?? null);
      setTitleDraft(payload.report.title ?? "");
      setNotesDraft(payload.report.notes ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  const saveMeta = async () => {
    if (!report?.id) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/app/reports/quarterly", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: report.id, title: titleDraft, notes: notesDraft }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось сохранить отчёт");
      }
      setReport(payload.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setSaving(false);
    }
  };

  const regenerate = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/app/reports/quarterly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, quarter, title: titleDraft || undefined, notes: notesDraft, lock: report?.isLocked ?? false }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error?.message ?? "Не удалось пересчитать отчёт");
      }
      setReport(data.report ?? null);
      setPayload(data.payload ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setSaving(false);
    }
  };

  const metrics = summary?.metrics ? { ...report?.metrics, ...summary.metrics } : report?.metrics;
  const periodLabel = summary ? `Q${summary.quarter} ${summary.year}` : report?.period.label ?? `Q${quarter} ${year}`;

  const exportEmployeesCsv = () => {
    if (!summary?.employees?.length) return;
    const header = ["name", "role", "level", "atRisk", "readyForPromo", "pilotsInvolved", "lastDecisionAt"];
    const rows = summary.employees.map((emp) => [
      emp.name,
      emp.role ?? "",
      emp.level ?? "",
      emp.isAtRisk ? "yes" : "no",
      emp.isReadyForPromo ? "yes" : "no",
      String(emp.pilotsInvolved ?? 0),
      emp.lastDecisionAt ?? "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, "'")}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quarterly-employees-${year}-Q${quarter}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    document.body.classList.add("print-mode");
    setTimeout(() => {
      window.print();
      document.body.classList.remove("print-mode");
    }, 50);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Quarterly</p>
          <h1 className="text-3xl font-semibold text-brand-text">Люди и навыки — квартальный обзор</h1>
          <p className="text-sm text-slate-600">Результаты пилотов, решения по людям и разрывы в навыках за выбранный квартал.</p>
        </div>
        <div className="flex gap-2">
          <SecondaryButton onClick={() => void load()} disabled={loading} className="px-4 py-2">
            Обновить
          </SecondaryButton>
          <SecondaryButton onClick={() => void regenerate()} disabled={saving} className="px-4 py-2">
            Пересчитать
          </SecondaryButton>
          <SecondaryButton
            href={`/app/analytics?since=${encodeURIComponent(quarterRange.since)}&until=${encodeURIComponent(quarterRange.until)}`}
            className="px-4 py-2"
          >
            Открыть аналитику
          </SecondaryButton>
          <PrimaryButton onClick={handlePrint} className="px-4 py-2">
            Версия для печати / PDF
          </PrimaryButton>
          <SecondaryButton href={`/api/app/reports/quarterly/decisions-csv?year=${year}&quarter=${quarter}`} className="px-4 py-2">
            Экспорт решений CSV
          </SecondaryButton>
          <SecondaryButton onClick={exportEmployeesCsv} className="px-4 py-2">
            Экспорт сотрудников CSV
          </SecondaryButton>
        </div>
      </div>

      {error && <Card className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>}

      <Card className="space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm text-slate-600">
            Год
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm">
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-600">
            Квартал
            <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm">
              {[1, 2, 3, 4].map((q) => (
                <option key={q} value={q}>
                  Q{q}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <Tag variant="outline">{periodLabel}</Tag>
            {report?.isLocked ? <Tag variant="outline">Locked</Tag> : <Tag variant="outline">Draft</Tag>}
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-brand-text">Название отчёта</label>
          <input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            disabled={report?.isLocked}
            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="Пилоты" value={metrics ? `${metrics.pilotsCompleted ?? metrics.pilotsCount ?? "–"}/${metrics.pilotsTotal ?? metrics.pilotsCount ?? "–"}` : "–"} sub="Завершено / всего" />
          <MetricCard label="Активные пилоты" value={metrics?.pilotsInProgress ?? metrics?.pilotsCount ?? "–"} />
          <MetricCard label="Шаблонные пилоты" value={metrics?.pilotsFromTemplates ?? "–"} />
          <MetricCard label="Людей затронуто" value={metrics?.employeesTouched ?? "–"} />
          <MetricCard label="В зоне риска" value={metrics?.employeesAtRisk ?? "–"} />
          <MetricCard label="Решения" value={metrics?.decisionsTotal ?? "–"} sub={`Impl: ${metrics?.decisionsImplemented ?? 0}`} />
          <MetricCard label="Промо" value={metrics?.promotionsCount ?? "–"} />
          <MetricCard label="Переводы" value={metrics?.lateralMovesCount ?? "–"} />
          <MetricCard label="Критичные gaps" value={metrics?.criticalSkillGaps ?? "–"} />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-brand-text">Top risks</h3>
            <Tag variant="outline">{summary?.topRisks?.length ?? report?.topRisks?.length ?? 0}</Tag>
          </div>
          {summary?.topRisks?.length ? (
            <ul className="space-y-2 text-sm text-slate-700">
              {summary.topRisks.map((risk) => {
                const reasons = risk.riskReasons?.join("; ");
                return (
                  <li key={risk.employeeId} className="rounded-xl border border-white/60 bg-white/90 p-3">
                    <p className="font-semibold text-brand-text">
                      <a href={`/app/employee/${risk.employeeId}`} className="text-brand-primary">
                        {risk.employeeName}
                      </a>
                    </p>
                    {risk.role && <p className="text-xs text-slate-500">{risk.role}</p>}
                    {reasons && <p className="text-xs text-slate-600">{reasons}</p>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Рисков не найдено.</p>
          )}
        </Card>
        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-brand-text">Top wins</h3>
            <Tag variant="outline">{summary?.topWins?.length ?? report?.topWins?.length ?? 0}</Tag>
          </div>
          {summary?.topWins?.length ? (
            <ul className="space-y-2 text-sm text-slate-700">
              {summary.topWins.map((win, idx) => {
                const reasons = win.winReasons?.join("; ");
                return (
                  <li key={`${win.employeeId ?? "win"}-${idx}`} className="rounded-xl border border-white/60 bg-white/90 p-3">
                    {win.employeeId ? (
                      <p className="font-semibold text-brand-text">
                        <a href={`/app/employee/${win.employeeId}`} className="text-brand-primary">
                          {win.employeeName ?? "Сотрудник"}
                        </a>
                      </p>
                    ) : (
                      <p className="font-semibold text-brand-text">{win.employeeName ?? "Успех"}</p>
                    )}
                    {win.role && <p className="text-xs text-slate-500">{win.role}</p>}
                    {reasons && <p className="text-xs text-slate-600">{reasons}</p>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Пока нет зафиксированных побед.</p>
          )}
        </Card>
        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-brand-text">Top шаблоны пилотов</h3>
            <Tag variant="outline">{summary?.topTemplates?.length ?? 0}</Tag>
          </div>
          {summary?.topTemplates?.length ? (
            <ul className="space-y-2 text-sm text-slate-700">
              {summary.topTemplates.map((tpl) => (
                <li key={tpl.templateId} className="rounded-xl border border-white/60 bg-white/90 p-3">
                  <p className="font-semibold text-brand-text">{tpl.title}</p>
                  <p className="text-xs text-slate-600">Использований: {tpl.used}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Пока нет пилотов из шаблонов.</p>
          )}
        </Card>
      </div>

      <Card className="space-y-2">
        <h3 className="text-lg font-semibold text-brand-text">Следующие шаги</h3>
        {report?.recommendedNextSteps?.length ? (
          <ul className="list-disc pl-5 text-sm text-slate-700">
            {report.recommendedNextSteps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Нет рекомендаций.</p>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-brand-text">Сотрудники за квартал</h3>
          <Tag variant="outline">{summary?.employees?.length ?? 0}</Tag>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">ФИО</th>
                <th className="px-3 py-2">Роль</th>
                <th className="px-3 py-2">Риск</th>
                <th className="px-3 py-2">Промо</th>
                <th className="px-3 py-2">Пилоты</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.employees ?? []).map((emp) => (
                <tr key={emp.id} className="border-t border-brand-border/60">
                  <td className="px-3 py-3">
                    <a href={`/app/employee/${emp.id}`} className="font-semibold text-brand-primary">
                      {emp.name}
                    </a>
                  </td>
                  <td className="px-3 py-3">{emp.role ?? "–"}</td>
                  <td className="px-3 py-3">{emp.isAtRisk ? "Да" : "Нет"}</td>
                  <td className="px-3 py-3">{emp.isReadyForPromo ? "Да" : "Нет"}</td>
                  <td className="px-3 py-3">{emp.pilotsInvolved ?? 0}</td>
                </tr>
              ))}
              {(summary?.employees?.length ?? 0) === 0 && (
                <tr>
                  <td className="px-3 py-3 text-sm text-slate-500" colSpan={5}>
                    Нет данных по сотрудникам.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {payload && (
        <div className="space-y-4">
          <Card className="space-y-2">
            <h3 className="text-lg font-semibold text-brand-text">Команда</h3>
            <div className="flex flex-wrap gap-2 text-sm text-slate-700">
              <Tag variant="outline">Всего: {payload.headcount.totalEmployees}</Tag>
              <Tag variant="outline">Активные: {payload.headcount.activeEmployees}</Tag>
            </div>
          </Card>

          <Card className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-brand-text">Роли и покрытие</h3>
              <Tag variant="outline">Ролей: {payload.roles.totalRoles}</Tag>
            </div>
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-1">Роль</th>
                  <th className="px-2 py-1">Сотрудников</th>
                </tr>
              </thead>
              <tbody>
                {payload.roles.employeesPerRole.map((role) => (
                  <tr key={role.roleId} className="border-t border-brand-border/60">
                    <td className="px-2 py-1">{role.roleName}</td>
                    <td className="px-2 py-1">{role.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-brand-text">Навыки и риски</h3>
              <Tag variant="outline">Отслеживаемых: {payload.skills.trackedSkills}</Tag>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-brand-text">Средний уровень по ролям</p>
                <ul className="space-y-1 text-sm text-slate-700">
                  {payload.skills.avgSkillLevelByRole.map((r) => (
                    <li key={r.roleId} className="flex justify-between rounded-lg border border-brand-border/50 px-3 py-2">
                      <span>{r.roleName}</span>
                      <span>{r.avgLevel}</span>
                    </li>
                  ))}
                  {payload.skills.avgSkillLevelByRole.length === 0 && <p className="text-xs text-slate-500">Нет данных</p>}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-text">Рисковые навыки</p>
                <ul className="space-y-1 text-sm text-slate-700">
                  {payload.skills.riskSkills.map((s) => (
                    <li key={s.skillCode} className="flex justify-between rounded-lg border border-brand-border/50 px-3 py-2">
                      <span>{s.skillCode}</span>
                      <span>{s.atRiskEmployees}</span>
                    </li>
                  ))}
                  {payload.skills.riskSkills.length === 0 && <p className="text-xs text-slate-500">Нет данных</p>}
                </ul>
              </div>
            </div>
          </Card>

          <Card className="space-y-2">
            <h3 className="text-lg font-semibold text-brand-text">Планы развития</h3>
            <div className="flex flex-wrap gap-2 text-sm text-slate-700">
              <Tag variant="outline">Всего: {payload.developmentGoals.totalGoals}</Tag>
              <Tag variant="outline">Активные: {payload.developmentGoals.activeGoals}</Tag>
              <Tag variant="outline">Завершено: {payload.developmentGoals.completedLastQuarter}</Tag>
              <Tag variant="outline">Просрочены (высокий приоритет): {payload.developmentGoals.highPriorityOverdue}</Tag>
              <Tag variant="outline">Стагнация: {payload.developmentGoals.staleGoals}</Tag>
            </div>
          </Card>

          <Card className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-brand-text">Пилоты</h3>
              <Tag variant="outline">Активные: {payload.pilots.activePilots}</Tag>
            </div>
            <div className="space-y-2">
              {payload.pilots.pilotSummaries.map((p) => (
                <div key={p.pilotId} className="rounded-xl border border-white/60 bg-white/90 p-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-brand-text">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {p.startDate ? `Старт: ${p.startDate}` : ""} {p.endDate ? `· Финал: ${p.endDate}` : ""}
                      </p>
                      <p className="text-xs text-slate-500">Участников: {p.participants}</p>
                    </div>
                    <PrimaryButton href={`/app/pilots/${p.pilotId}`} className="px-3 py-1 text-xs">
                      Открыть
                    </PrimaryButton>
                  </div>
                </div>
              ))}
              {payload.pilots.pilotSummaries.length === 0 && <p className="text-sm text-slate-500">Нет пилотов.</p>}
            </div>
          </Card>
        </div>
      )}

      <Card className="space-y-2">
        <h3 className="text-lg font-semibold text-brand-text">Резюме</h3>
        <p className="text-sm text-slate-700">
          {summary?.summaryParagraph ??
            `За ${periodLabel} сотрудников ${metrics?.employeesTouched ?? 0}, рисков ${metrics?.employeesAtRisk ?? 0}, завершено пилотов ${metrics?.pilotsCompleted ?? 0}.`}
        </p>
      </Card>

      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-brand-text">HR summary</h3>
          <PrimaryButton onClick={() => void saveMeta()} disabled={saving || report?.isLocked} className="px-4 py-2">
            Сохранить заметки
          </PrimaryButton>
        </div>
        <textarea
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          disabled={report?.isLocked}
          rows={5}
          className="w-full rounded-2xl border border-brand-border px-3 py-2 text-sm"
          placeholder="Краткие выводы HR по кварталу"
        />
      </Card>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/90 p-3">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="text-2xl font-semibold text-brand-text">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

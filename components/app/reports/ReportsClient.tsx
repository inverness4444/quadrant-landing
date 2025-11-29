"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { ExportData, PilotDetailedReport, WorkspaceSnapshotReport } from "@/services/types/report";

type ReportsClientProps = {
  workspaceId: string;
  workspaceName: string;
};

type CopyTarget = "snapshot" | "pilot";

const riskBadgeMeta = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-emerald-100 text-emerald-700 border-emerald-200",
} as const;

const stepStatusMeta: Record<
  PilotDetailedReport["steps"][number]["status"],
  { label: string; badge: string }
> = {
  not_started: { label: "Не начато", badge: "bg-slate-100 text-slate-600" },
  in_progress: { label: "В работе", badge: "bg-amber-100 text-amber-700" },
  done: { label: "Готово", badge: "bg-emerald-100 text-emerald-700" },
};

export default function ReportsClient({ workspaceId, workspaceName }: ReportsClientProps) {
  const mountedRef = useRef(true);
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshotReport | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [snapshotCopyState, setSnapshotCopyState] = useState<"ok" | "error" | null>(null);

  const [pilotReport, setPilotReport] = useState<PilotDetailedReport | null>(null);
  const [pilotMissing, setPilotMissing] = useState(false);
  const [pilotLoading, setPilotLoading] = useState(true);
  const [pilotError, setPilotError] = useState<string | null>(null);
  const [pilotCopyState, setPilotCopyState] = useState<"ok" | "error" | null>(null);

  const [exportOptions, setExportOptions] = useState({
    includeEmployees: true,
    includeSkills: true,
    includeLinks: true,
  });
  const [exportLoading, setExportLoading] = useState<"json" | "csv" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<"json" | "csv" | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadSnapshot = useCallback(async () => {
    setSnapshotLoading(true);
    setSnapshotError(null);
    try {
      const response = await fetch("/api/app/reports/snapshot", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Не удалось загрузить снимок workspace");
      }
      const data = (await response.json()) as WorkspaceSnapshotReport;
      if (!mountedRef.current) return;
      setSnapshot(data);
    } catch (error) {
      if (!mountedRef.current) return;
      setSnapshot(null);
      setSnapshotError(error instanceof Error ? error.message : "Неизвестная ошибка");
    } finally {
      if (!mountedRef.current) return;
      setSnapshotLoading(false);
    }
  }, []);

  const loadPilot = useCallback(async () => {
    setPilotLoading(true);
    setPilotError(null);
    try {
      const response = await fetch("/api/app/reports/pilot", { cache: "no-store" });
      if (response.status === 404) {
        if (!mountedRef.current) return;
        setPilotMissing(true);
        setPilotReport(null);
        return;
      }
      if (!response.ok) {
        throw new Error("Не удалось загрузить отчёт по пилоту");
      }
      const data = (await response.json()) as PilotDetailedReport;
      if (!mountedRef.current) return;
      setPilotReport(data);
      setPilotMissing(false);
    } catch (error) {
      if (!mountedRef.current) return;
      setPilotReport(null);
      setPilotError(error instanceof Error ? error.message : "Неизвестная ошибка");
    } finally {
      if (!mountedRef.current) return;
      setPilotLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSnapshot();
    void loadPilot();
  }, [loadSnapshot, loadPilot]);

  const hasSnapshotData = useMemo(() => {
    return Boolean(snapshot && snapshot.totalEmployees > 0 && snapshot.totalSkills > 0);
  }, [snapshot]);

  const topSkills = useMemo(() => snapshot?.topSkills ?? [], [snapshot]);

  const handleCopySummary = useCallback(
    async (text: string, target: CopyTarget) => {
      try {
        if (!navigator?.clipboard) {
          throw new Error("Клипборд недоступен в этом браузере");
        }
        await navigator.clipboard.writeText(text);
        if (target === "snapshot") {
          setSnapshotCopyState("ok");
        } else {
          setPilotCopyState("ok");
        }
      } catch (error) {
        if (target === "snapshot") {
          setSnapshotCopyState("error");
        } else {
          setPilotCopyState("error");
        }
        console.error(error);
      } finally {
        setTimeout(() => {
          if (target === "snapshot") {
            setSnapshotCopyState(null);
          } else {
            setPilotCopyState(null);
          }
        }, 2000);
      }
    },
    [],
  );

  const fetchExportData = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("includeEmployees", String(exportOptions.includeEmployees));
    params.set("includeSkills", String(exportOptions.includeSkills));
    params.set("includeLinks", String(exportOptions.includeLinks));
    const response = await fetch(`/api/app/reports/export?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Не удалось подготовить выгрузку");
    }
    return (await response.json()) as ExportData;
  }, [exportOptions]);

  const handleDownloadJson = useCallback(async () => {
    setExportLoading("json");
    setExportError(null);
    setExportSuccess(null);
    try {
      const data = await fetchExportData();
      const payload = JSON.stringify(data, null, 2);
      const filename = buildFilename(workspaceName, workspaceId, "json");
      downloadBlob(payload, filename, "application/json");
      setExportSuccess("json");
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Неизвестная ошибка");
    } finally {
      setExportLoading(null);
    }
  }, [fetchExportData, workspaceId, workspaceName]);

  const handleDownloadCsv = useCallback(async () => {
    setExportLoading("csv");
    setExportError(null);
    setExportSuccess(null);
    try {
      const data = await fetchExportData();
      const csv = buildCsvFromExport(data);
      const filename = buildFilename(workspaceName, workspaceId, "csv");
      downloadBlob(csv, filename, "text/csv");
      setExportSuccess("csv");
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Неизвестная ошибка");
    } finally {
      setExportLoading(null);
    }
  }, [fetchExportData, workspaceId, workspaceName]);

  const riskBadges = useMemo(() => {
    if (!snapshot) return [];
    return [
      { label: "Высокий риск", value: snapshot.riskBreakdown.high, className: riskBadgeMeta.high },
      { label: "Средний риск", value: snapshot.riskBreakdown.medium, className: riskBadgeMeta.medium },
      { label: "Низкий риск", value: snapshot.riskBreakdown.low, className: riskBadgeMeta.low },
    ];
  }, [snapshot]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Отчёты</p>
        <h1 className="text-3xl font-semibold text-brand-text">Отчёты для руководства</h1>
        <p className="text-base text-slate-600">
          Здесь можно подготовить снимок по workspace, собрать краткий отчёт по пилоту и выгрузить данные для аналитиков.
        </p>
      </header>

      <Card className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Снимок команды</p>
            <h2 className="text-2xl font-semibold text-brand-text">Workspace «{workspaceName}»</h2>
            <p className="text-sm text-slate-500">
              Quadrant собирает данные о {snapshot?.totalEmployees ?? "—"} сотрудниках и {snapshot?.totalSkills ?? "—"} навыках.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={() => void loadSnapshot()} disabled={snapshotLoading} className="px-4">
              {snapshotLoading ? "Обновляем…" : "Перезагрузить"}
            </SecondaryButton>
            {snapshot && (
              <PrimaryButton className="px-4" onClick={() => void handleCopySummary(snapshot.summary, "snapshot")}>
                Скопировать summary
              </PrimaryButton>
            )}
          </div>
        </div>
        {snapshotCopyState === "ok" && <p className="text-sm text-emerald-600">Summary скопировано.</p>}
        {snapshotCopyState === "error" && (
          <p className="text-sm text-red-600">Не удалось скопировать текст, попробуйте вручную.</p>
        )}

        {snapshotLoading && !snapshot && (
          <p className="text-sm text-slate-500">Загружаем свежие данные по workspace…</p>
        )}
        {snapshotError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {snapshotError}{" "}
            <button type="button" className="font-semibold underline" onClick={() => void loadSnapshot()}>
              Повторить
            </button>
          </div>
        )}
        {!snapshotError && !snapshotLoading && !hasSnapshotData && (
          <p className="text-sm text-slate-600">
            Недостаточно данных для построения отчёта. Добавьте сотрудников и навыки в workspace.
          </p>
        )}
        {snapshot && hasSnapshotData && (
          <>
            <p className="text-base text-brand-text">{snapshot.summary}</p>
            <div className="flex flex-wrap gap-2">
              {riskBadges.map((badge) => (
                <span
                  key={badge.label}
                  className={`inline-flex items-center rounded-full border px-4 py-1 text-xs font-semibold ${badge.className}`}
                >
                  {badge.label}: {badge.value}
                </span>
              ))}
            </div>
            <div className="overflow-x-auto rounded-2xl border border-brand-border/70">
              <table className="min-w-full divide-y divide-brand-border text-sm">
                <thead className="bg-brand-muted/50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Навык</th>
                    <th className="px-4 py-3 text-left">Сотрудники</th>
                    <th className="px-4 py-3 text-left">Покрытие</th>
                    <th className="px-4 py-3 text-left">Bus factor</th>
                    <th className="px-4 py-3 text-left">Риск</th>
                  </tr>
                </thead>
                <tbody>
                  {topSkills.map((skill) => (
                    <tr key={skill.skillId} className="border-b border-brand-border/60">
                      <td className="px-4 py-3 font-semibold text-brand-text">{skill.name}</td>
                      <td className="px-4 py-3 text-slate-600">{skill.peopleCount}</td>
                      <td className="px-4 py-3 text-slate-600">{skill.coverage.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-slate-600">{skill.busFactor}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${riskBadgeMeta[skill.riskLevel]}`}>
                          {riskLabel(skill.riskLevel)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-brand-text">
              <Tag variant="outline">Интеграций: {snapshot.totalIntegrations}</Tag>
              <Tag variant="outline">Артефактов: {snapshot.totalArtifacts}</Tag>
            </div>
            {snapshot.topArtifactContributors.length > 0 && (
              <div className="rounded-2xl border border-brand-border/60 bg-white/70 p-3 text-sm text-slate-600">
                <p className="text-sm font-semibold text-brand-text">Лидеры по артефактам</p>
                <ul className="mt-2 space-y-1 text-xs">
                  {snapshot.topArtifactContributors.map((leader) => (
                    <li key={leader.employeeId}>
                      <Link href={`/app/employee/${leader.employeeId}`} className="font-semibold text-brand-primary">
                        {leader.name}
                      </Link>{" "}
                      — {leader.position} ·{" "}
                      {leader.artifacts} артеф.
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {snapshot.teamSummaries.length > 0 && (
              <div className="rounded-2xl border border-brand-border/60 bg-white/70 p-4 text-sm text-slate-600">
                <p className="text-sm font-semibold text-brand-text">Команды</p>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  {snapshot.teamSummaries.map((team) => (
                    <div key={team.teamId} className="rounded-2xl border border-brand-border/50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <Link href={`/app/team/${team.teamId}`} className="font-semibold text-brand-primary">
                          {team.name}
                        </Link>
                        <span className="text-xs text-slate-500">{team.headcount} человек</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Навыков в риске: {team.riskSkills}</p>
                      {team.dominantSkills.length > 0 && (
                        <p className="mt-1 text-xs text-slate-500">
                          Сильные стороны: {team.dominantSkills.join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {snapshot.pilot ? (
              <div className="rounded-2xl border border-brand-border/70 bg-white/70 p-4 text-sm text-slate-600">
                <p className="font-semibold text-brand-text">Пилот: {snapshot.pilot.name}</p>
                <p className="text-sm text-slate-600">{snapshot.pilot.summary}</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-brand-border/70 p-4 text-sm text-slate-500">
                Пилот ещё не запущен — начните процесс в разделе{" "}
                <Link href="/app/pilot" className="font-semibold text-brand-primary underline">
                  «Пилот»
                </Link>
                .
              </div>
            )}
          </>
        )}
      </Card>

      <Card className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Отчёт по пилоту</p>
            <h2 className="text-2xl font-semibold text-brand-text">Замены и основные выводы</h2>
            <p className="text-sm text-slate-500">
              Показываем прогресс чеклиста, ключевые риски и рекомендации для руководства.
            </p>
          </div>
          {pilotReport && (
            <PrimaryButton className="px-4" onClick={() => void handleCopySummary(pilotReport.summary, "pilot")}>
              Скопировать отчёт
            </PrimaryButton>
          )}
        </div>
        {pilotCopyState === "ok" && <p className="text-sm text-emerald-600">Текст отчёта скопирован.</p>}
        {pilotCopyState === "error" && (
          <p className="text-sm text-red-600">Не удалось скопировать текст, попробуйте вручную.</p>
        )}
        {pilotLoading && !pilotReport && (
          <p className="text-sm text-slate-500">Загружаем прогресс пилота…</p>
        )}
        {pilotError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {pilotError}{" "}
            <button type="button" className="font-semibold underline" onClick={() => void loadPilot()}>
              Повторить
            </button>
          </div>
        )}
        {pilotMissing && !pilotReport && !pilotLoading && (
          <div className="rounded-2xl border border-dashed border-brand-border/70 p-5 text-sm text-slate-600">
            <p className="font-semibold text-brand-text">Пилот ещё не запущен.</p>
            <p className="mt-1">
              Перейдите в раздел пилота, чтобы настроить шаги и получить отчёт.
            </p>
            <SecondaryButton href="/app/pilot" className="mt-3 px-4">
              Перейти к пилоту
            </SecondaryButton>
          </div>
        )}
        {pilotReport && (
          <>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <Tag variant="outline">Статус: {pilotStatusLabel(pilotReport.pilot.status)}</Tag>
              {pilotReport.pilot.startDate && (
                <span>Период: {formatDateRange(pilotReport.pilot.startDate, pilotReport.pilot.endDate)}</span>
              )}
              {pilotReport.pilot.goals && <span>Цели: {pilotReport.pilot.goals}</span>}
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-text">Прогресс шагов</p>
              <div className="mt-3 space-y-3">
                {pilotReport.steps.map((step) => (
                  <div key={step.id} className="rounded-2xl border border-brand-border/60 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-brand-text">{step.title}</p>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${stepStatusMeta[step.status].badge}`}>
                        {stepStatusMeta[step.status].label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{step.description}</p>
                    {step.relatedMetrics.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                        {step.relatedMetrics.map((metric) => (
                          <span key={`${step.id}-${metric.label}`} className="rounded-full bg-brand-muted/70 px-3 py-1">
                            {metric.label}: {metric.value}
                          </span>
                        ))}
                      </div>
                    )}
                    {step.notes && <p className="mt-2 text-sm text-slate-600">Заметка: {step.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-brand-border/70 bg-white/70 p-4">
                <p className="text-sm font-semibold text-brand-text">Ключевые риски</p>
                {pilotReport.riskHighlights.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">Сейчас рисков не обнаружено.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {pilotReport.riskHighlights.map((risk) => (
                      <li key={risk.id} className="rounded-xl border border-brand-border/60 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold text-brand-text">{risk.title}</span>
                          <span className={`text-xs font-semibold uppercase ${riskBadgeMeta[risk.severity]}`}>
                            {riskLabel(risk.severity)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{risk.description}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-2xl border border-brand-border/70 bg-white/70 p-4">
                <p className="text-sm font-semibold text-brand-text">Следующие шаги</p>
                <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-slate-600">
                  {pilotReport.nextSteps.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
                <SecondaryButton href="/app/pilot" className="mt-4 px-4">
                  Открыть чеклист пилота
                </SecondaryButton>
              </div>
            </div>
          </>
        )}
      </Card>

      <Card className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Выгрузка</p>
          <h2 className="text-2xl font-semibold text-brand-text">JSON/CSV данные</h2>
          <p className="text-sm text-slate-500">
            Выберите, что включить в файл, и скачайте данные для отчётов или BI-систем.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {([
            { key: "includeEmployees", label: "Сотрудники и их навыки" },
            { key: "includeSkills", label: "Список навыков" },
            { key: "includeLinks", label: "Связи сотрудник ↔ навык" },
          ] as const).map((option) => (
            <label key={option.key} className="flex items-center gap-3 rounded-2xl border border-brand-border/70 bg-white/70 p-4 text-sm text-brand-text">
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-brand-border/70 text-brand-primary focus:ring-brand-primary"
                checked={exportOptions[option.key]}
                onChange={(event) =>
                  setExportOptions((prev) => ({ ...prev, [option.key]: event.target.checked }))
                }
              />
              {option.label}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <PrimaryButton onClick={() => void handleDownloadJson()} disabled={exportLoading !== null} className="px-5">
            {exportLoading === "json" ? "Готовим JSON…" : "Скачать JSON"}
          </PrimaryButton>
          <SecondaryButton onClick={() => void handleDownloadCsv()} disabled={exportLoading !== null} className="px-5">
            {exportLoading === "csv" ? "Готовим CSV…" : "Скачать CSV"}
          </SecondaryButton>
        </div>
        {exportError && <p className="text-sm text-red-600">{exportError}</p>}
        {exportSuccess === "json" && <p className="text-sm text-emerald-600">JSON-файл готов.</p>}
        {exportSuccess === "csv" && <p className="text-sm text-emerald-600">CSV-файл готов.</p>}
      </Card>
    </div>
  );
}

function riskLabel(severity: "low" | "medium" | "high") {
  switch (severity) {
    case "high":
      return "Высокий";
    case "medium":
      return "Средний";
    case "low":
    default:
      return "Низкий";
  }
}

function pilotStatusLabel(status: PilotDetailedReport["pilot"]["status"]) {
  switch (status) {
    case "active":
      return "Активный";
    case "completed":
      return "Завершён";
    case "planned":
      return "Запланирован";
    case "archived":
    default:
      return "Архив";
  }
}

function formatDateRange(start: string, end?: string | null) {
  const formatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });
  const startText = formatter.format(new Date(start));
  if (!end) {
    return `Старт ${startText}`;
  }
  return `${startText} — ${formatter.format(new Date(end))}`;
}

function buildFilename(workspaceName: string, workspaceId: string, extension: "json" | "csv") {
  const normalized = workspaceName.toLowerCase().replace(/[^a-z0-9]+/gi, "-");
  const datePart = new Date().toISOString().slice(0, 10);
  const suffix = workspaceId ? `-${workspaceId.slice(0, 6)}` : "";
  return `quadrant-${normalized || "workspace"}${suffix}-${datePart}.${extension}`;
}

function downloadBlob(payload: string, filename: string, type: string) {
  const blob = new Blob([payload], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildCsvFromExport(data: ExportData) {
  const header = ["employeeName", "role", "team", "skill", "skillLevel"];
  const rows: string[][] = [];
  const employees = data.employees ?? [];
  for (const employee of employees) {
    if (employee.skills.length === 0) {
      rows.push([employee.name, employee.position, employee.teamName ?? "", "", ""]);
      continue;
    }
    for (const skill of employee.skills) {
      rows.push([employee.name, employee.position, employee.teamName ?? "", skill.name, String(skill.level)]);
    }
  }
  return [header, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
}

function csvEscape(value: string) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

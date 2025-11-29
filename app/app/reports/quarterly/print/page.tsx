"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { QuarterlyReportDTO } from "@/services/quarterlyReportService";

export default function QuarterlyPrintPage() {
  const params = useSearchParams();
  const yearParam = params.get("year");
  const quarterParam = params.get("quarter");
  const [report, setReport] = useState<QuarterlyReportDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearParam, quarterParam]);

  const load = async () => {
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (yearParam) qs.set("year", yearParam);
      if (quarterParam) qs.set("quarter", quarterParam);
      const response = await fetch(`/api/app/reports/quarterly${qs.toString() ? `?${qs.toString()}` : ""}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось загрузить отчёт");
      }
      setReport(payload.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    }
  };

  const doPrint = () => {
    window.print();
  };

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!report) return <div className="p-6">Загрузка...</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6 text-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase">Quarterly report</p>
          <h1 className="text-3xl font-semibold">{report.title}</h1>
          <p className="text-sm">{report.period.label}</p>
        </div>
        <button onClick={doPrint} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Печать</button>
      </div>

      <section className="space-y-1">
        <h2 className="text-xl font-semibold">Метрики</h2>
        <ul className="list-disc pl-5 text-sm">
          <li>Пилоты: {report.metrics.pilotsCompleted} завершено из {report.metrics.pilotsTotal}, активные {report.metrics.pilotsInProgress}</li>
          <li>Люди: затронуто {report.metrics.employeesTouched}, в риске {report.metrics.employeesAtRisk}</li>
          <li>Решения: всего {report.metrics.decisionsTotal}, внедрено {report.metrics.decisionsImplemented}, предложено {report.metrics.decisionsProposed}</li>
          <li>Промо: {report.metrics.promotionsCount}, переводы: {report.metrics.lateralMovesCount}</li>
          <li>Критичные gaps: {report.metrics.criticalSkillGaps}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Top risks</h2>
        {report.topRisks.length ? (
          <ul className="list-disc pl-5 text-sm">
            {report.topRisks.map((risk) => (
              <li key={risk.employeeId}>
                {risk.employeeName} {risk.teamName ? `(${risk.teamName})` : ""}: {risk.reason}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">Рисков не найдено.</p>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold">Top wins</h2>
        {report.topWins.length ? (
          <ul className="list-disc pl-5 text-sm">
            {report.topWins.map((win, idx) => (
              <li key={`${win.employeeId ?? "win"}-${idx}`}>
                {win.label}: {win.description}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">Побед пока нет.</p>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold">Следующие шаги</h2>
        {report.recommendedNextSteps.length ? (
          <ul className="list-disc pl-5 text-sm">
            {report.recommendedNextSteps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">Нет рекомендаций.</p>
        )}
      </section>

      {report.notes && (
        <section>
          <h2 className="text-xl font-semibold">HR summary</h2>
          <p className="whitespace-pre-line text-sm">{report.notes}</p>
        </section>
      )}
    </div>
  );
}

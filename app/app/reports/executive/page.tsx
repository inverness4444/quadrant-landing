import { redirect } from "next/navigation";
import Link from "next/link";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { buildExecutiveReportSnapshot } from "@/services/executiveReportService";
import PrintButton from "@/components/common/PrintButton";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("ru-RU");
}

export default async function ExecutiveReportPage({ searchParams }: { searchParams?: { periodStart?: string; periodEnd?: string } }) {
  const { workspace, member } = await requireWorkspaceContext();
  if (!["owner", "admin", "hr"].includes(member.role)) {
    redirect("/app");
  }
  const end = searchParams?.periodEnd ? new Date(searchParams.periodEnd) : new Date();
  const start = searchParams?.periodStart ? new Date(searchParams.periodStart) : new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
  const snapshot = await buildExecutiveReportSnapshot({ workspaceId: workspace.id, periodStart: start, periodEnd: end });

  return (
    <div className="space-y-6 p-6 print:p-0">
        <div className="flex items-center justify-between print:hidden">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Executive Report</p>
            <h1 className="text-3xl font-semibold text-brand-text">Отчёт для руководства</h1>
            <p className="text-sm text-slate-600">{formatDate(snapshot.periodStart)} — {formatDate(snapshot.periodEnd)}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/app/reports" className="rounded-xl border border-brand-border px-3 py-2 text-sm text-slate-700 hover:bg-brand-bg/60">
              Назад к отчётам
            </Link>
            <PrintButton className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow">
              Печать / PDF
            </PrintButton>
          </div>
        </div>

      <section className="rounded-2xl border border-brand-border/60 bg-white/90 p-5 shadow-sm print:border-none print:shadow-none">
        <h2 className="text-xl font-semibold text-brand-text">Итоговые метрики</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <MetricCard title="Сотрудники" value={snapshot.headcount} description="Общее количество в workspace" />
          <MetricCard title="Активные цели" value={snapshot.goalsSummary.active} description={`Завершено: ${snapshot.goalsSummary.completed}`} />
          <MetricCard title="Просроченные цели" value={snapshot.goalsSummary.overdue} description="Требуют внимания" intent="danger" />
          <MetricCard title="Критичные навыки" value={snapshot.skillGapsSummary.criticalSkillsCount} description="Skill gap по ролям" />
          <MetricCard title="Активные программы" value={snapshot.programsSummary.activePrograms} description="Общее количество" />
          <MetricCard title="Плановые 1:1" value={snapshot.oneOnOnesSummary.planned} description={`Просрочено: ${snapshot.oneOnOnesSummary.overdue}`} />
          <MetricCard title="Опросы" value={snapshot.surveysSummary.activeSurveys} description={`Sentiment: ${snapshot.surveysSummary.lastPulseSentiment ?? "—"}`} />
          <MetricCard title="Квартальные отчёты" value={snapshot.quarterlyReportsSummary.reportsCount} description={snapshot.quarterlyReportsSummary.lastReportTitle ?? "Нет отчётов"} />
        </div>
      </section>
    </div>
  );
}

type MetricCardProps = { title: string; value: number | string; description?: string; intent?: "danger" | "neutral" };
function MetricCard({ title, value, description, intent }: MetricCardProps) {
  return (
    <div className={`rounded-xl border ${intent === "danger" ? "border-red-200 bg-red-50" : "border-brand-border/60 bg-white"} p-4`}> 
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
      <p className="text-2xl font-semibold text-brand-text">{value}</p>
      {description && <p className="text-sm text-slate-600">{description}</p>}
    </div>
  );
}

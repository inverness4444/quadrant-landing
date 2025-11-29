import Link from "next/link";
import { requireWorkspaceContext } from "@/lib/workspaceContext";

const blocks = [
  {
    title: "Цели и развитие",
    description: "Экспорт целей сотрудников и статус выполнения.",
    exportHref: "/api/app/exports/goals.csv",
    viewHref: "/app/skills",
  },
  {
    title: "Навыки и пробелы",
    description: "Skill gap по ролям и людям.",
    exportHref: "/api/app/exports/skill-gap.csv",
    viewHref: "/app/roles",
  },
  {
    title: "Программы и пилоты",
    description: "Список программ и пилотов с участниками.",
    exportHref: "/api/app/exports/programs.csv?includePilots=true",
    viewHref: "/app/programs",
  },
  {
    title: "1:1 и взаимодействие",
    description: "Предстоящие и прошедшие 1:1.",
    exportHref: "/api/app/exports/one-on-ones.csv",
    viewHref: "/app/one-on-ones",
  },
  {
    title: "Опросы и настроение",
    description: "Активные и завершённые опросы.",
    exportHref: "/api/app/exports/surveys.csv",
    viewHref: "/app/feedback",
  },
  {
    title: "Квартальные отчёты",
    description: "Экспорт сводных квартальных отчётов.",
    exportHref: "/api/app/exports/quarterly-reports.csv",
    viewHref: "/app/reports/quarterly",
  },
];

export default async function ReportsPage() {
  const { member } = await requireWorkspaceContext();
  const allowed = ["owner", "admin", "hr"].includes(member.role);
  if (!allowed) return <p className="p-6 text-sm text-slate-600">Доступ к отчётам только для HR/администраторов.</p>;
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Reports</p>
        <h1 className="text-3xl font-semibold text-brand-text">Отчёты и выгрузки</h1>
        <p className="text-sm text-slate-600">Скачайте данные в CSV или откройте готовые отчёты для руководства.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {blocks.map((block) => (
          <div key={block.title} className="rounded-2xl border border-brand-border/60 bg-white/90 p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-brand-text">{block.title}</h3>
            <p className="text-sm text-slate-600">{block.description}</p>
            <div className="mt-3 flex gap-3 text-sm">
              <Link href={block.exportHref} className="rounded-xl border border-brand-border px-3 py-1 font-medium text-brand-text hover:bg-brand-bg/60">
                Скачать CSV
              </Link>
              <Link href={block.viewHref} className="rounded-xl border border-brand-border px-3 py-1 text-slate-700 hover:bg-brand-bg/60">
                Открыть
              </Link>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-brand-border/60 bg-white/90 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-brand-text">Executive Report</h3>
            <p className="text-sm text-slate-600">Краткий отчёт для руководства с основными метриками.</p>
          </div>
          <Link href="/app/reports/executive" className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow">
            Открыть
          </Link>
        </div>
      </div>
    </div>
  );
}

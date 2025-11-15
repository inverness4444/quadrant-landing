import Card from "@/components/common/Card";
import MetricCard from "@/components/app/MetricCard";
import LevelDistribution from "@/components/app/LevelDistribution";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { getOverviewMetrics, type OverviewMetrics } from "@/services/dashboardService";

export default async function Page() {
  const { workspace } = await requireWorkspaceContext();
  const metrics = await getOverviewMetrics(workspace.id);
  const nextSteps = buildNextSteps(metrics);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-text">Обзор</h1>
        <p className="text-sm text-slate-600">
          Прогресс workspace «{workspace.name}»: навыки, треки и активность команды
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Сотрудников" value={metrics.employees} />
        <MetricCard label="Навыков в базе" value={metrics.skills} />
        <MetricCard label="Активных треков" value={metrics.tracks} />
        <MetricCard label="Средний уровень навыков" value={metrics.averageSkillLevel || "—"} sublabel="по оценкам команды" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <LevelDistribution data={metrics.levelDistribution} />
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-slate-600">Что делать дальше</p>
          {nextSteps.length === 0 ? (
            <p className="text-sm text-slate-500">
              Отлично! Продолжайте развивать навыки и следить за прогрессом.
            </p>
          ) : (
            <ul className="space-y-3 text-sm text-slate-600">
              {nextSteps.map((step) => (
                <li key={step.label} className="rounded-2xl border border-brand-border px-4 py-3">
                  <p className="font-semibold text-brand-text">{step.label}</p>
                  <p className="text-xs text-slate-500">{step.description}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function buildNextSteps(metrics: OverviewMetrics) {
  const steps: Array<{ label: string; description: string }> = [];
  if (metrics.employees === 0) {
    steps.push({
      label: "Добавьте первого сотрудника",
      description: "Перенесите команду в раздел «Команда», чтобы увидеть реальный граф навыков.",
    });
  }
  if (metrics.skills < 5) {
    steps.push({
      label: "Опишите ключевые навыки",
      description: "Перейдите в «Навыки» и зафиксируйте технологии или софт-скиллы команды.",
    });
  }
  if (metrics.tracks === 0) {
    steps.push({
      label: "Настройте карьерные треки",
      description: "Создайте базовые уровни развития (Junior/Middle/Senior) для ключевых ролей.",
    });
  }
  return steps.slice(0, 3);
}

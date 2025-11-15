import type { LevelDistributionItem } from "@/services/dashboardService";

type Props = {
  data: LevelDistributionItem[];
};

export default function LevelDistribution({ data }: Props) {
  const maxCount = Math.max(...data.map((item) => item.count), 1);
  return (
    <div className="rounded-3xl border border-brand-border bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-brand-text">Распределение по уровням</p>
      <div className="mt-4 space-y-3">
        {data.map((item) => (
          <div key={item.level}>
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>{item.level}</span>
              <span>
                {item.count} чел · {item.percentage}%
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-brand-muted">
              <div
                className="h-full rounded-full bg-brand-primary transition-all"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

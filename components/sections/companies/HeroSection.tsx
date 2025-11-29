import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";

type HeroMetric = {
  label: string;
  value: string;
  description?: string;
};

type HeroSectionProps = {
  title: string;
  subtitle: string;
  points: string[];
  metrics: HeroMetric[];
  ctaHref: string;
  pilotHref: string;
};

export default function HeroSection({ title, subtitle, points, metrics, ctaHref, pilotHref }: HeroSectionProps) {
  return (
    <section className="grid gap-10 rounded-[32px] border border-white/60 bg-white/80 p-10 shadow-[0_30px_80px_rgba(15,23,42,0.12)] lg:grid-cols-2">
      <div className="space-y-6">
        <p className="text-sm font-semibold uppercase tracking-[0.4em] text-brand-primary/80">Для компаний</p>
        <div className="space-y-4">
          <h1>{title}</h1>
          <p className="text-lg text-slate-600">{subtitle}</p>
        </div>
        <ul className="space-y-2 text-sm text-slate-600">
          {points.map((point) => (
            <li key={point} className="flex items-center gap-2">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-brand-primary" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3 sm:flex-row">
          <PrimaryButton href={ctaHref}>Запросить пилот</PrimaryButton>
          <SecondaryButton href={pilotHref} className="bg-white/80">
            Посмотреть, как это работает
          </SecondaryButton>
        </div>
      </div>
      <Card className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Пилот</p>
          <p className="text-lg font-semibold text-brand-text">Формат работы</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl bg-brand-muted/60 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{metric.label}</p>
              <p className="text-lg font-semibold text-brand-text">{metric.value}</p>
              {metric.description && <p className="text-xs text-slate-500">{metric.description}</p>}
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-600">
          Диагностика → интеграции → граф навыков → презентация выводов для руководства.
        </p>
      </Card>
    </section>
  );
}

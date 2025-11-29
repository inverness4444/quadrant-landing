import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";

type HeroMetric = {
  label: string;
  value: string;
};

type HeroSectionProps = {
  title: string;
  subtitle: string;
  profileName: string;
  profileRole: string;
  topSkills: string[];
  metrics: HeroMetric[];
  primaryHref: string;
  secondaryHref: string;
};

export default function HeroSection({
  title,
  subtitle,
  profileName,
  profileRole,
  topSkills,
  metrics,
  primaryHref,
  secondaryHref,
}: HeroSectionProps) {
  return (
    <section className="grid gap-10 rounded-[32px] border border-white/60 bg-white/80 p-10 shadow-[0_30px_80px_rgba(15,23,42,0.12)] lg:grid-cols-2">
      <div className="space-y-6">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-primary/80">Для специалистов</p>
        <div className="space-y-4">
          <h1>{title}</h1>
          <p className="text-lg text-slate-600">{subtitle}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <PrimaryButton href={primaryHref}>Оставить заявку</PrimaryButton>
          <SecondaryButton href={secondaryHref} className="bg-white/80">
            Посмотреть пример профиля
          </SecondaryButton>
        </div>
      </div>
      <Card className="space-y-5">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Профиль специалиста</p>
          <p className="text-2xl font-semibold text-brand-text">{profileName}</p>
          <p className="text-sm text-slate-500">{profileRole}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Топ-навыки</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {topSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-white/60 bg-brand-muted/60 px-3 py-1 text-xs font-semibold text-brand-text"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl bg-brand-muted/60 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{metric.label}</p>
              <p className="text-lg font-semibold text-brand-text">{metric.value}</p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";

type HeroSectionProps = {
  title: string;
  subtitle: string;
  highlights: string[];
  primaryHref: string;
  secondaryHref: string;
};

export default function HeroSection({ title, subtitle, highlights, primaryHref, secondaryHref }: HeroSectionProps) {
  return (
    <section className="grid gap-10 rounded-[32px] border border-white/70 bg-white/90 p-10 shadow-[0_25px_70px_rgba(15,23,42,0.12)] lg:grid-cols-[1.1fr,0.9fr]">
      <div className="space-y-6">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-primary/80">О платформе Quadrant</p>
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold text-brand-text">{title}</h1>
          <p className="text-lg text-slate-600">{subtitle}</p>
        </div>
        <ul className="space-y-2 text-sm text-slate-600">
          {highlights.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-brand-primary" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3 sm:flex-row">
          <PrimaryButton href={primaryHref}>Запросить пилот</PrimaryButton>
          <SecondaryButton href={secondaryHref} className="bg-white/80">
            Посмотреть, как это работает
          </SecondaryButton>
        </div>
      </div>
      <Card className="space-y-5 border-white/60 bg-white/80 p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Что подключаем</p>
        <div className="space-y-4 text-sm text-slate-600">
          <Highlight label="Код" description="GitHub / GitLab — PR, ревью, ветки и история изменений." />
          <Highlight label="Задачи" description="Jira, YouTrack и другие трекеры — статусы, исполнители, обсуждения." />
          <Highlight label="Документы" description="Confluence, Notion, внутренние базы знаний и ADR." />
          <Highlight label="Коммуникации" description="Slack, Teams и сервисы созвонов с инженерными решениями." />
        </div>
        <p className="text-xs text-slate-500">
          Quadrant берёт только рабочие артефакты. Переписка из личных каналов и файлы без разрешения не обрабатываются.
        </p>
      </Card>
    </section>
  );
}

function Highlight({ label, description }: { label: string; description: string }) {
  return (
    <div className="rounded-2xl border border-brand-border/70 px-4 py-3">
      <p className="text-sm font-semibold text-brand-text">{label}</p>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  );
}

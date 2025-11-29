import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";

type PricingHeroSectionProps = {
  primaryHref: string;
  secondaryHref: string;
};

export default function PricingHeroSection({ primaryHref, secondaryHref }: PricingHeroSectionProps) {
  const badges = ["200–5000 сотрудников", "Пилот 30–90 дней", "Он-прем / облако по запросу"];
  return (
    <section className="rounded-[32px] border border-white/60 bg-white/80 p-10 text-center shadow-[0_30px_80px_rgba(15,23,42,0.12)]">
      <p className="text-sm font-semibold uppercase tracking-[0.4em] text-brand-primary/80">Тарифы</p>
      <h1 className="mt-4 text-4xl font-semibold text-brand-text">Цены на Quadrant зависят от размера команды и интеграций</h1>
      <p className="mt-4 text-lg text-slate-600">
        Quadrant подключается к Git, Jira, Confluence, Notion и другим инструментам, строит граф навыков и артефактов. Модель оплаты — корпоративная подписка под ваши команды.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
        {badges.map((badge) => (
          <span key={badge} className="rounded-full border border-white/70 bg-white px-4 py-2 text-slate-600">
            {badge}
          </span>
        ))}
      </div>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <PrimaryButton href={primaryHref}>Запросить расчёт</PrimaryButton>
        <SecondaryButton href={secondaryHref} className="bg-white/80">
          Скачать примеры отчётов
        </SecondaryButton>
      </div>
    </section>
  );
}

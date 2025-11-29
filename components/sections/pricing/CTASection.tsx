import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";

export default function PricingCTASection() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-4xl rounded-[32px] border border-white/60 bg-white/85 px-6 py-12 text-center shadow-[0_30px_80px_rgba(15,23,42,0.12)] sm:px-10">
        <h2 className="text-3xl font-semibold text-brand-text">Хотите обсудить тарифы под ваши команды?</h2>
        <p className="mt-3 text-sm text-slate-600">
          Расскажите про ваши команды, интеграции и цели — пришлём расчёт и примеры отчётов для HR и руководителей.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <PrimaryButton href="/contact">Запросить расчёт</PrimaryButton>
          <SecondaryButton href="/contact">Назначить созвон</SecondaryButton>
        </div>
      </div>
    </section>
  );
}

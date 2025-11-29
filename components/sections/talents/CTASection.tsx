import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";

type TalentsCTASectionProps = {
  primaryHref: string;
  secondaryHref: string;
};

export default function TalentsCTASection({ primaryHref, secondaryHref }: TalentsCTASectionProps) {
  return (
    <section className="rounded-[32px] bg-gradient-to-r from-brand-primary/90 to-brand-accent/80 p-10 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">Следующий шаг</p>
        <h2 className="text-3xl font-semibold leading-tight">Хотите, чтобы ваша работа была видна так же ясно, как цифры?</h2>
        <p className="text-sm text-white/80">
          Оставьте контакты — поделимся примером профиля и расскажем, как Quadrant запускается в вашей компании.
        </p>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <PrimaryButton href={primaryHref}>Оставить заявку</PrimaryButton>
        <SecondaryButton href={secondaryHref} className="bg-white text-brand-text">
          Посмотреть пример профиля
        </SecondaryButton>
      </div>
    </section>
  );
}

import SectionTitle from "@/components/common/SectionTitle";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";

type PlatformCTASectionProps = {
  title: string;
  subtitle: string;
  primaryHref: string;
  secondaryHref: string;
};

export default function PlatformCTASection({ title, subtitle, primaryHref, secondaryHref }: PlatformCTASectionProps) {
  return (
    <section className="rounded-[32px] bg-gradient-to-r from-brand-primary to-brand-accent/90 p-10 text-white shadow-[0_35px_80px_rgba(15,23,42,0.25)]">
      <SectionTitle title={title} subtitle={subtitle} align="center" />
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <PrimaryButton href={primaryHref}>Запросить пилот</PrimaryButton>
        <SecondaryButton href={secondaryHref} className="bg-white/10 !text-white border-white/60 hover:bg-white/20">
          Посмотреть тарифы
        </SecondaryButton>
      </div>
    </section>
  );
}

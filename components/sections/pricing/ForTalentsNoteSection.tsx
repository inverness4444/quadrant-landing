import Card from "@/components/common/Card";
import SecondaryButton from "@/components/common/SecondaryButton";

type ForTalentsNoteSectionProps = {
  ctaHref: string;
};

export default function ForTalentsNoteSection({ ctaHref }: ForTalentsNoteSectionProps) {
  return (
    <section>
      <Card className="flex flex-col gap-4 bg-brand-muted/60 p-8 text-brand-text sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Для специалистов</p>
          <h2 className="text-2xl font-semibold">Quadrant для специалистов бесплатен</h2>
          <p className="text-sm text-slate-600">
            Quadrant — инструмент компании. Сотрудники получают профили автоматически, когда организация подключает Quadrant.
          </p>
        </div>
        <SecondaryButton href={ctaHref} className="bg-white">
          Расскажите о Quadrant своему HR
        </SecondaryButton>
      </Card>
    </section>
  );
}

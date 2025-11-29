import Card from "@/components/common/Card";
import SectionTitle from "@/components/common/SectionTitle";

type Outcome = {
  title: string;
  description: string;
};

type OutcomesSectionProps = {
  outcomes: Outcome[];
};

export default function OutcomesSection({ outcomes }: OutcomesSectionProps) {
  return (
    <section className="space-y-6">
      <SectionTitle
        title="Что получает компания"
        subtitle="Пилот собирает понятные артефакты для разговоров о людях, росте и инвестициях."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {outcomes.map((outcome) => (
          <Card key={outcome.title} className="space-y-2">
            <p className="text-lg font-semibold text-brand-text">{outcome.title}</p>
            <p className="text-sm text-slate-600">{outcome.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

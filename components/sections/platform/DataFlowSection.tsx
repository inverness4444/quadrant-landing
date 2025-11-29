import Card from "@/components/common/Card";
import SectionTitle from "@/components/common/SectionTitle";

export type DataFlowStep = {
  title: string;
  description: string;
};

type DataFlowSectionProps = {
  steps: DataFlowStep[];
};

export default function DataFlowSection({ steps }: DataFlowSectionProps) {
  return (
    <section className="space-y-6">
      <SectionTitle
        eyebrow="Как это работает"
        title="Три шага к прозрачной карте навыков"
        subtitle="Никакой ручной магии. Quadrant сам связывает артефакты с людьми и показывает динамику развития."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {steps.map((step, index) => (
          <Card key={step.title} className="space-y-2 p-6">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-primary/10 text-sm font-semibold text-brand-primary">
              0{index + 1}
            </div>
            <p className="text-lg font-semibold text-brand-text">{step.title}</p>
            <p className="text-sm text-slate-600">{step.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

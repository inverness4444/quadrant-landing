import Card from "@/components/common/Card";
import SectionTitle from "@/components/common/SectionTitle";

type PilotStep = {
  title: string;
  description: string;
};

type PilotSectionProps = {
  steps: PilotStep[];
  note: string;
  anchorId: string;
};

export default function PilotSection({ steps, note, anchorId }: PilotSectionProps) {
  return (
    <section className="space-y-6" id={anchorId}>
      <SectionTitle
        title="Как проходит пилот 30–90 дней"
        subtitle="Диагностика, интеграции и граф навыков — чтобы показать ценность Quadrant на ваших командах."
      />
      <div className="grid gap-4 md:grid-cols-4">
        {steps.map((step, index) => (
          <Card key={step.title} className="space-y-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-white">
              {index + 1}
            </span>
            <p className="text-lg font-semibold text-brand-text">{step.title}</p>
            <p className="text-sm text-slate-600">{step.description}</p>
          </Card>
        ))}
      </div>
      <p className="text-xs text-slate-500">{note}</p>
    </section>
  );
}

import Card from "@/components/common/Card";
import SectionTitle from "@/components/common/SectionTitle";

type PilotStep = {
  title: string;
  description: string;
  duration: string;
};

type HowPilotWorksSectionProps = {
  steps: PilotStep[];
  anchorId: string;
};

export default function HowPilotWorksSection({ steps, anchorId }: HowPilotWorksSectionProps) {
  return (
    <section className="space-y-6" id={anchorId}>
      <SectionTitle
        title="Как проходит пилот 3–6 недель"
        subtitle="Диагностика, сбор артефактов и презентация выводов для руководителей."
      />
      <div className="grid gap-4 md:grid-cols-4">
        {steps.map((step, index) => (
          <Card key={step.title} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-white">
                {index + 1}
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary">
                {step.duration}
              </span>
            </div>
            <p className="text-lg font-semibold text-brand-text">{step.title}</p>
            <p className="text-sm text-slate-600">{step.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

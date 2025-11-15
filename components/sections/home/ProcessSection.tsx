import Card from "@/components/common/Card";
import SectionTitle from "@/components/common/SectionTitle";
import type { Step } from "@/types/content";

type ProcessSectionProps = {
  steps: Step[];
};

export default function ProcessSection({ steps }: ProcessSectionProps) {
  return (
    <section className="space-y-6">
      <SectionTitle
        eyebrow="Процесс"
        title="Как это работает"
        subtitle="Три шага, чтобы построить живую карту навыков без бесконечных таблиц."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <Card key={step.title}>
            <p className="text-sm font-semibold text-brand-primary">
              Шаг {index + 1}
            </p>
            <p className="mt-2 text-lg font-semibold text-brand-text">
              {step.title}
            </p>
            <p className="mt-2 text-sm text-slate-600">{step.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

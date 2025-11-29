import Card from "@/components/common/Card";
import SectionTitle from "@/components/common/SectionTitle";

type Step = {
  title: string;
  description: string;
};

type HowItWorksSectionProps = {
  steps: Step[];
};

export default function HowItWorksSection({ steps }: HowItWorksSectionProps) {
  return (
    <section className="space-y-6">
      <SectionTitle
        title="Как специалист попадает в Quadrant"
        subtitle="Quadrant использует вашу текущую работу — никаких дополнительных «отчётов»."
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
    </section>
  );
}

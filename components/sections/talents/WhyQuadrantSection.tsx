import Card from "@/components/common/Card";
import SectionTitle from "@/components/common/SectionTitle";

type Benefit = {
  title: string;
  description: string;
};

type WhyQuadrantSectionProps = {
  benefits: Benefit[];
};

export default function WhyQuadrantSection({ benefits }: WhyQuadrantSectionProps) {
  return (
    <section className="space-y-6">
      <SectionTitle
        title="Зачем Quadrant специалисту"
        subtitle="Ваши артефакты и вклад становятся видимыми и понятными для компании."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {benefits.map((benefit) => (
          <Card key={benefit.title} className="space-y-2">
            <p className="text-lg font-semibold text-brand-text">{benefit.title}</p>
            <p className="text-sm text-slate-600">{benefit.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

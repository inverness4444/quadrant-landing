import Card from "@/components/common/Card";
import SectionTitle from "@/components/common/SectionTitle";
import type { CaseStudyCard } from "@/content/cases";

type CaseSectionProps = {
  cases: CaseStudyCard[];
  title?: string;
  subtitle?: string;
};

export default function CaseSection({
  cases,
  title = "Quadrant в деле",
  subtitle = "Несколько примеров того, как компании используют внутренние квесты.",
}: CaseSectionProps) {
  return (
    <section className="space-y-6">
      <SectionTitle eyebrow="Кейсы" title={title} subtitle={subtitle} />
      <div className="grid gap-4 md:grid-cols-3">
        {cases.map((item) => (
          <Card key={item.id} className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-slate-500">
                {item.company} · {item.industry}
              </p>
              <p className="text-base text-slate-700">{item.before}</p>
            </div>
            <p className="text-sm font-semibold text-brand-text">После:</p>
            <p className="text-sm text-slate-600">{item.after}</p>
            <ul className="mt-auto space-y-1 text-xs text-slate-500">
              {item.metrics.map((metric) => (
                <li key={metric}>• {metric}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </section>
  );
}

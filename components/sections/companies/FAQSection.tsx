import Card from "@/components/common/Card";
import SectionTitle from "@/components/common/SectionTitle";

type FAQItem = {
  question: string;
  answer: string;
};

type FAQSectionProps = {
  items: FAQItem[];
};

export default function FAQSection({ items }: FAQSectionProps) {
  return (
    <section className="space-y-6">
      <SectionTitle
        title="FAQ"
        subtitle="Ответы на популярные вопросы про пилот Quadrant."
      />
      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.question} className="space-y-2">
            <details>
              <summary className="cursor-pointer text-lg font-semibold text-brand-text">
                {item.question}
              </summary>
              <p className="mt-2 text-sm text-slate-600">{item.answer}</p>
            </details>
          </Card>
        ))}
      </div>
    </section>
  );
}

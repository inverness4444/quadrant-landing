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
        title="Вопросы специалистов"
        subtitle="Поговорим честно о прозрачности и росте."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item.question} className="space-y-2">
            <p className="text-lg font-semibold text-brand-text">{item.question}</p>
            <p className="text-sm text-slate-600">{item.answer}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

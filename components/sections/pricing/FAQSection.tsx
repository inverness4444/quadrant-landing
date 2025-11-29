import Card from "@/components/common/Card";
import SectionTitle from "@/components/common/SectionTitle";

type FAQItem = {
  question: string;
  answer: string;
};

type PricingFAQSectionProps = {
  items: FAQItem[];
};

export default function PricingFAQSection({ items }: PricingFAQSectionProps) {
  return (
    <section className="space-y-6">
      <SectionTitle
        title="FAQ по тарифам"
        subtitle="Ответы на популярные вопросы о расчётах, интеграциях и безопасности."
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

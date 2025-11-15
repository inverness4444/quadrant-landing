import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SectionTitle from "@/components/common/SectionTitle";
import { contentService } from "@/services/contentService";
import type { Metadata } from "next";

const pricingData = contentService.getPricingContent();

export const metadata: Metadata = {
  title: "Quadrant — тарифы и предложения",
  description:
    "Тарифы Quadrant для старта, роста и enterprise-команд. Уточните цену под ваши процессы и интеграции.",
};

export default function PricingPage() {
  const { plans } = pricingData;
  return (
    <div className="space-y-10">
      <SectionTitle
        eyebrow="Тарифы"
        title="Выберите подходящий план"
        subtitle="Цену уточните у нас — подберём конфигурацию под ваши процессы."
        align="center"
      />
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.name} className="flex flex-col">
            <p className="text-sm font-semibold uppercase text-brand-primary">
              {plan.name}
            </p>
            <p className="mt-2 text-lg font-semibold text-brand-text">
              {plan.audience}
            </p>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
              {plan.features.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm font-semibold text-slate-600">{plan.note}</p>
            <PrimaryButton href="/contact" className="mt-4">
              {plan.ctaLabel}
            </PrimaryButton>
          </Card>
        ))}
      </div>
    </div>
  );
}

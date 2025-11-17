import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SectionTitle from "@/components/common/SectionTitle";
import DemoLoginBanner from "@/components/marketing/DemoLoginBanner";
import { listAllPlans } from "@/repositories/planRepository";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quadrant — тарифы и предложения",
  description:
    "Тарифы Quadrant для старта, роста и enterprise-команд. Уточните цену под ваши процессы и интеграции.",
};

const formatPlanFeatures = (plan: Awaited<ReturnType<typeof listAllPlans>>[number]) => {
  const features: string[] = [];
  features.push(
    plan.maxMembers && plan.maxMembers > 0
      ? `До ${plan.maxMembers} участников`
      : "Неограниченное число участников",
  );
  features.push(
    plan.maxEmployees && plan.maxEmployees > 0
      ? `До ${plan.maxEmployees} сотрудников`
      : "Все сотрудники без ограничений",
  );
  features.push(
    plan.maxIntegrations && plan.maxIntegrations > 0
      ? `${plan.maxIntegrations} интеграции`
      : "Все интеграции включены",
  );
  return features;
};

const formatPrice = (value: number) => {
  if (!value) return "Бесплатно";
  return `от ${value} $/мес`;
};

function planCta(planCode: string, isFree: boolean) {
  if (isFree) {
    return { label: "Начать бесплатно", href: "/auth/register" };
  }
  return { label: "Связаться с нами", href: `/contact?plan=${planCode}` };
}

export default async function PricingPage() {
  const plans = await listAllPlans();
  return (
    <div className="space-y-10">
      <SectionTitle
        eyebrow="Тарифы"
        title="Выберите подходящий план"
        subtitle="Цену уточните у нас — подберём конфигурацию под ваши процессы."
        align="center"
      />
      <DemoLoginBanner className="border-dashed" />
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const cta = planCta(plan.code, plan.pricePerMonth === 0);
          return (
            <Card key={plan.id} className="flex flex-col border border-brand-border/70">
              <p className="text-sm font-semibold uppercase text-brand-primary">{plan.name}</p>
              <p className="mt-2 text-lg font-semibold text-brand-text">{plan.description}</p>
              <p className="mt-2 text-sm font-semibold text-slate-600">{formatPrice(plan.pricePerMonth)}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
                {formatPlanFeatures(plan).map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
              <div className="mt-4">
                <PrimaryButton href={cta.href} className="w-full justify-center">
                  {cta.label}
                </PrimaryButton>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {plan.pricePerMonth === 0 ? "Всегда бесплатно" : "Персональная цена по запросу"}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

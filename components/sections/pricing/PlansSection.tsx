import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import SectionTitle from "@/components/common/SectionTitle";

export type PricingPlan = {
  title: string;
  audience: string;
  description: string;
  limit: string;
  badge?: string;
  highlight?: boolean;
  features: string[];
  cta: {
    label: string;
    href: string;
    variant?: "primary" | "secondary";
  };
};

type PlansSectionProps = {
  plans: PricingPlan[];
};

export default function PlansSection({ plans }: PlansSectionProps) {
  return (
    <section className="space-y-6">
      <SectionTitle
        title="Тарифы Quadrant"
        subtitle="Подбираем конфигурацию под количество команд, интеграций и требования безопасности."
        align="center"
      />
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const ButtonComponent = plan.cta.variant === "secondary" ? SecondaryButton : PrimaryButton;
          return (
            <Card
              key={plan.title}
              className={`flex h-full flex-col gap-4 ${plan.highlight ? "border-brand-primary/40 shadow-[0_35px_80px_rgba(93,95,239,0.15)]" : ""}`}
            >
              {plan.badge && (
                <span className="self-start rounded-full bg-brand-primary/15 px-3 py-1 text-xs font-semibold text-brand-primary">
                  {plan.badge}
                </span>
              )}
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">{plan.title}</p>
                <p className="text-sm text-slate-500">{plan.audience}</p>
              </div>
              <p className="text-lg font-semibold text-brand-text">{plan.limit}</p>
              <p className="text-sm text-slate-600">{plan.description}</p>
              <ul className="flex flex-1 flex-col gap-2 text-sm text-slate-600">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-brand-primary/70" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <ButtonComponent href={plan.cta.href}>{plan.cta.label}</ButtonComponent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

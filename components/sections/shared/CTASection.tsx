"use client";

import SectionTitle from "@/components/common/SectionTitle";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import type { CTA } from "@/types/content";
import { trackEvent } from "@/services/analytics";

type CTASectionProps = {
  title: string;
  subtitle: string;
  actions: CTA[];
};

export default function CTASection({ title, subtitle, actions }: CTASectionProps) {
  return (
    <section className="rounded-3xl border border-brand-border bg-white p-8 text-center shadow-sm">
      <SectionTitle title={title} subtitle={subtitle} align="center" />
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {actions.map((action) => {
          const Button =
            action.variant === "secondary" ? SecondaryButton : PrimaryButton;
          return (
            <Button
              key={action.href}
              href={action.href}
              onClick={() => trackEvent("cta_click", { location: "cta", label: action.label })}
            >
              {action.label}
            </Button>
          );
        })}
      </div>
    </section>
  );
}

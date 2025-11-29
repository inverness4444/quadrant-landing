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
    <section className="rounded-[32px] bg-gradient-to-r from-brand-primary/90 to-brand-accent/80 p-10 text-center text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
      <SectionTitle title={title} subtitle={subtitle} align="center" />
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {actions.map((action) => {
          const Button =
            action.variant === "secondary" ? SecondaryButton : PrimaryButton;
          return (
            <Button
              key={`${action.href}-${action.label}`}
              href={action.href}
              className={action.variant === "secondary" ? "bg-white text-brand-text" : ""}
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

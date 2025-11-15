"use client";

import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { HeroContent } from "@/types/content";
import { trackEvent } from "@/services/analytics";

type HeroSectionProps = {
  hero: HeroContent;
  highlights: string[];
};

export default function HeroSection({ hero, highlights }: HeroSectionProps) {
  return (
    <section className="grid gap-8 rounded-3xl border border-brand-border bg-white p-6 shadow-sm animate-fade-up lg:grid-cols-2">
      <div className="space-y-6">
        {hero.eyebrow && (
          <p className="text-sm font-semibold uppercase text-brand-primary">
            {hero.eyebrow}
          </p>
        )}
        <div className="space-y-4">
          <h1>{hero.title}</h1>
          {hero.subtitle && (
            <p className="text-lg text-slate-600">{hero.subtitle}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <PrimaryButton
            href={hero.primaryCta.href}
            onClick={() => trackEvent("cta_click", { location: "hero_primary" })}
          >
            {hero.primaryCta.label}
          </PrimaryButton>
          {hero.secondaryCta && (
            <SecondaryButton
              href={hero.secondaryCta.href}
              onClick={() => trackEvent("cta_click", { location: "hero_secondary" })}
            >
              {hero.secondaryCta.label}
            </SecondaryButton>
          )}
        </div>
        {hero.caption && <p className="text-sm text-slate-500">{hero.caption}</p>}
      </div>
      <div className="rounded-3xl border border-dashed border-brand-border bg-brand-muted p-6 text-sm text-slate-600">
        <p>
          Quadrant подключается к вашим инструментам (Git, Jira, Confluence и другие)
          и строит граф навыков. Вы видите, кто чем силён, и какие шаги нужны для
          роста.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {highlights.map((item) => (
            <Tag key={item}>{item}</Tag>
          ))}
        </div>
      </div>
    </section>
  );
}

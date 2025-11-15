import Card from "@/components/common/Card";
import SectionTitle from "@/components/common/SectionTitle";
import Tag from "@/components/common/Tag";
import CTASection from "@/components/sections/shared/CTASection";
import { contentService } from "@/services/contentService";
import type { Metadata } from "next";

const talentsData = contentService.getTalentContent();

export const metadata: Metadata = {
  title: "Quadrant для специалистов — честные карьерные треки",
  description:
    "Quadrant показывает текущий уровень, навыки, которые тянут вверх, и артефакты, которые нужно усилить для промо.",
};

export default function TalentsPage() {
  const { hero, cards, path } = talentsData;
  return (
    <div className="space-y-16">
      <section className="rounded-3xl border border-brand-border bg-white p-8 shadow-sm">
        <SectionTitle
          eyebrow={hero.eyebrow}
          title={hero.title}
          subtitle={hero.subtitle}
        />
      </section>

      <section className="space-y-6">
        <SectionTitle
          eyebrow="Прозрачность"
          title="Что видит специалист в Quadrant"
        />
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.title}>
              <p className="text-lg font-semibold text-brand-text">
                {card.title}
              </p>
              <p className="mt-2 text-sm text-slate-600">{card.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionTitle
          eyebrow="Рост"
          title="Пример пути развития"
          subtitle="Понимаете, какие артефакты и навыки нужны на каждом уровне."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {path.map((step) => (
            <Card key={step.title}>
              <Tag variant="outline">{step.title}</Tag>
              <p className="mt-3 text-sm text-slate-600">{step.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <CTASection
        title="Попросите вашу компанию подключить Quadrant"
        subtitle="Мы покажем демо и расскажем, как построить честные карьерные пути."
        actions={[
          { label: "Запросить демо", href: "/contact", variant: "primary" },
        ]}
      />
    </div>
  );
}

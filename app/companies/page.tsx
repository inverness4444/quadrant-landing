import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SectionTitle from "@/components/common/SectionTitle";
import Tag from "@/components/common/Tag";
import CTASection from "@/components/sections/shared/CTASection";
import CaseSection from "@/components/sections/home/CaseSection";
import { contentService } from "@/services/contentService";
import type { Metadata } from "next";

const companyData = contentService.getCompanyContent();

export const metadata: Metadata = {
  title: "Quadrant для компаний — прозрачные навыки и грейды",
  description:
    "Quadrant помогает компаниям увидеть реальные навыки сотрудников, объективно проводить performance-review и планировать развитие команды.",
};

export default function CompaniesPage() {
  const { hero, benefits, integrations, caseStudy, cards } = companyData;
  return (
    <div className="space-y-16">
      <section className="rounded-3xl border border-brand-border bg-white p-8 shadow-sm">
        <SectionTitle
          eyebrow={hero.eyebrow}
          title={hero.title}
          subtitle={hero.subtitle}
        />
        <PrimaryButton href={hero.primaryCta.href} className="mt-6">
          {hero.primaryCta.label}
        </PrimaryButton>
      </section>

      <section className="space-y-6">
        <SectionTitle
          eyebrow="Выгоды"
          title="Основные выгоды"
          subtitle="Quadrant помогает HR, CTO и фаундерам видеть реальную картину навыков."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {benefits.map((item) => (
            <Card key={item.title}>
              <p className="text-lg font-semibold text-brand-text">{item.title}</p>
              <p className="mt-2 text-sm text-slate-600">{item.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionTitle
          eyebrow="Интеграции"
          title="Мы подключаемся к привычным системам"
          subtitle="Quadrant поддерживает репозитории, таск-трекеры и базы знаний."
        />
        <div className="flex flex-wrap gap-3">
          {integrations.map((integration) => (
            <Tag key={integration.name} variant="outline" className="text-base">
              {integration.name}
            </Tag>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionTitle
          eyebrow="Кейс"
          title={caseStudy.title}
          subtitle="Короткий пример пилота с компаниями среднего размера."
        />
        <Card>
          <ul className="space-y-3 text-sm text-slate-600">
            {caseStudy.summary.map((row) => (
              <li key={row}>• {row}</li>
            ))}
          </ul>
          <PrimaryButton href={caseStudy.cta.href} className="mt-6">
            {caseStudy.cta.label}
          </PrimaryButton>
        </Card>
      </section>

      <CaseSection cases={cards} title="Quadrant в деле" subtitle="Пара быстрых примеров роста" />

      <CTASection
        title="Готовы увидеть Quadrant на своих командах?"
        subtitle="Подключим пилот, покажем граф навыков и план развития по вашим артефактам."
        actions={[
          { label: "Запросить демо", href: "/contact", variant: "primary" },
          { label: "Обсудить интеграции", href: "/platform", variant: "secondary" },
        ]}
      />
    </div>
  );
}

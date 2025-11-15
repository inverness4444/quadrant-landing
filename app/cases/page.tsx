import Card from "@/components/common/Card";
import SectionTitle from "@/components/common/SectionTitle";
import { caseStudies, detailedCases } from "@/content/cases";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Кейсы Quadrant — как компании используют внутренние квесты",
  description:
    "Сборник референсов, как Quadrant помогает компаниям подсвечивать навыки и развивать команды.",
};

export default function CasesPage() {
  return (
    <div className="space-y-10">
      <Link href="/companies" className="text-sm text-brand-link transition hover:opacity-80">
        ← Назад к разделу для компаний
      </Link>
      <SectionTitle
        eyebrow="Кейсы"
        title="Quadrant в деле"
        subtitle="Несколько историй о том, как компании вводят внутренние квесты и живую карту навыков."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {caseStudies.map((item) => (
          <Card key={item.id} className="space-y-2">
            <p className="text-sm font-semibold uppercase text-slate-500">
              {item.company} · {item.industry}
            </p>
            <p className="text-sm text-slate-700">
              <strong>До:</strong> {item.before}
            </p>
            <p className="text-sm text-slate-700">
              <strong>После:</strong> {item.after}
            </p>
            <ul className="text-xs text-slate-500">
              {item.metrics.map((metric) => (
                <li key={metric}>• {metric}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      {detailedCases.map((caseItem) => (
        <Card key={caseItem.id} className="space-y-4">
          <SectionTitle title={caseItem.title} />
          {caseItem.sections.map((section) => (
            <div key={section.heading}>
              <p className="text-sm font-semibold text-brand-text">
                {section.heading}
              </p>
              <p className="text-sm text-slate-600">{section.text}</p>
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}

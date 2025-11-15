import Card from "@/components/common/Card";
import SectionTitle from "@/components/common/SectionTitle";
import { contentService } from "@/services/contentService";
import type { Metadata } from "next";

const platformData = contentService.getPlatformContent();

export const metadata: Metadata = {
  title: "Quadrant — как работает платформа",
  description:
    "Quadrant строит граф навыков из ваших систем, обеспечивает безопасность данных и развивает продукт с фокусом на рост команд.",
};

export default function PlatformPage() {
  const { sources, security, roadmap } = platformData;
  return (
    <div className="space-y-16">
      <section className="space-y-6 rounded-3xl border border-brand-border bg-white p-8 shadow-sm">
        <SectionTitle
          eyebrow="О платформе"
          title="Что такое граф навыков в Quadrant"
          subtitle="Мы связываем людей, навыки и реальные артефакты работы. Получается граф, который показывает, какие компетенции уже есть и где есть потенциал роста."
        />
      </section>

      <section className="space-y-6">
        <SectionTitle eyebrow="Источники" title="Из каких источников берём данные" />
        <div className="grid gap-4 md:grid-cols-2">
          {sources.map((item) => (
            <Card key={item} className="text-lg font-semibold text-brand-text">
              {item}
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionTitle
          eyebrow="Безопасность"
          title="Безопасность и приватность"
          subtitle="Работаем по корпоративным стандартам и поддерживаем on-premise по запросу."
        />
        <Card>
          <ul className="space-y-3 text-sm text-slate-600">
            {security.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="space-y-6">
        <SectionTitle
          eyebrow="Roadmap"
          title="Планы развития продукта"
          subtitle="Делимся, над чем работаем в ближайших релизах."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {roadmap.map((item) => (
            <Card key={item} className="text-sm text-slate-600">
              {item}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

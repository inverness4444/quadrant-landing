import CTASection from "@/components/sections/shared/CTASection";
import HeroSection from "@/components/sections/home/HeroSection";
import TeamGraph from "@/components/sections/demo/TeamGraph";
import CareerTrack from "@/components/sections/demo/CareerTrack";
import SectionTitle from "@/components/common/SectionTitle";
import { getDemoData } from "@/services/demoService";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quadrant Demo — живая карта навыков",
  description:
    "Интерактивная демо-страница Quadrant: граф навыков, роли, карьерные треки.",
};

export default function DemoPage() {
  const demo = getDemoData();

  return (
    <div className="space-y-16">
      <HeroSection
        hero={{
          eyebrow: "демо",
          title: "Демо: живая карта навыков команды",
          subtitle: "Фейковые данные, но логика совпадает с реальными запуском Quadrant.",
          primaryCta: { label: "Попробовать демо", href: "#graph" },
          secondaryCta: { label: "Запросить пилот", href: "/contact" },
        }}
        highlights={["4 команды", "20+ навыков", "карьерные треки"]}
      />

      <section id="graph" className="space-y-6">
        <SectionTitle
          eyebrow="Граф команды"
          title="Связи между людьми и навыками"
          subtitle="Кликните на сотрудника или навык, чтобы увидеть детали и реальные артефакты."
        />
        <TeamGraph employees={demo.employees} skills={demo.skills} edges={demo.edges} />
      </section>

      <section className="space-y-6">
        <SectionTitle
          eyebrow="Карьерный трек"
          title="Как Quadrant показывает путь роста"
          subtitle="Выберите сотрудника и посмотрите, что нужно для перехода на следующий уровень."
        />
        <CareerTrack tracks={demo.tracks} employees={demo.employees} />
      </section>

      <CTASection
        title="Хотите увидеть Quadrant на своей команде?"
        subtitle="Построим живую карту навыков и покажем карьерные треки по вашим артефактам."
        actions={[{ label: "Запросить демо Quadrant", href: "/contact", variant: "primary" }]}
      />
    </div>
  );
}

import FAQItem from "@/components/common/FAQItem";
import SectionTitle from "@/components/common/SectionTitle";
import CTASection from "@/components/sections/shared/CTASection";
import TrackExplorer from "@/components/sections/home/TrackExplorer";
import HeroSection from "@/components/sections/home/HeroSection";
import AudienceSection from "@/components/sections/home/AudienceSection";
import ProcessSection from "@/components/sections/home/ProcessSection";
import CaseSection from "@/components/sections/home/CaseSection";
import DemoLoginBanner from "@/components/marketing/DemoLoginBanner";
import { contentService } from "@/services/contentService";
import { Metadata } from "next";

const homeData = contentService.getHomeContent();

export const metadata: Metadata = {
  title: "Quadrant — живая карта навыков вашей команды",
  description:
    "Quadrant анализирует реальные артефакты работы, строит граф навыков и помогает компаниям развивать внутренние таланты.",
  openGraph: {
    title: "Quadrant — живая карта навыков вашей команды",
    description:
      "Живой граф навыков, прозрачные карьерные треки и честное performance-review.",
    url: "https://quadrant.app/",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Quadrant — карта навыков",
      },
    ],
  },
};

export default function HomePage() {
  const { hero, highlights, search, tracks, audiences, steps, cta, faq, sections, cases } =
    homeData;

  return (
    <div className="space-y-16">
      <HeroSection hero={hero} highlights={highlights} />
      <DemoLoginBanner />

      <section className="space-y-6">
        <SectionTitle
          eyebrow={sections.search.eyebrow}
          title={sections.search.title}
          subtitle={sections.search.subtitle}
        />
        <TrackExplorer placeholder={search.placeholder} tags={search.tags} tracks={tracks} />
      </section>

      <AudienceSection columns={audiences} />

      <ProcessSection steps={steps} />

      <CaseSection cases={cases} />

      <section id="faq" className="space-y-6">
        <SectionTitle
          eyebrow={sections.faq.eyebrow}
          title={sections.faq.title}
          subtitle={sections.faq.subtitle}
        />
        <div className="grid gap-4">
          {faq.map((item) => (
            <FAQItem key={item.question} {...item} />
          ))}
        </div>
      </section>

      <CTASection title={cta.title} subtitle={cta.subtitle} actions={cta.actions} />
    </div>
  );
}

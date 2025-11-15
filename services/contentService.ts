import { companiesHero, companyBenefits, companyCase, companyIntegrations } from "@/content/companies";
import { caseStudies } from "@/content/cases";
import { contactContent } from "@/content/contact";
import { faqItems } from "@/content/faq";
import { homeHero, searchConfig, trackCards, audienceColumns, processSteps, heroHighlights, homeCta, homeSections, homeCases } from "@/content/home";
import { pricingPlans } from "@/content/pricing";
import { dataSources, roadmapItems, securityPoints } from "@/content/platform";
import { talentsHero, talentCards, growthPath } from "@/content/talents";
import { footerNavigation, mainNavigation } from "@/content/navigation";
import type {
  AudienceColumn,
  BenefitCard,
  CaseStudy,
  ContactContent,
  FAQItem,
  HeroContent,
  Integration,
  PricingPlan,
  SearchConfig,
  Step,
  Track,
  FooterLinkGroup,
  NavLink,
} from "@/types/content";

export const contentService = {
  getNavigation(): { header: NavLink[]; footer: FooterLinkGroup[] } {
    return {
      header: mainNavigation.map((link) =>
        link.key === "login"
          ? { ...link, href: "/auth/login" }
          : link.key === "demo"
          ? { ...link, href: "/demo" }
          : link,
      ),
      footer: footerNavigation,
    };
  },
  getHomeContent(): {
    hero: HeroContent;
    highlights: string[];
    search: SearchConfig;
    tracks: Track[];
    audiences: AudienceColumn[];
    steps: Step[];
    cta: typeof homeCta;
    faq: FAQItem[];
    sections: typeof homeSections;
    cases: typeof homeCases;
  } {
    return {
      hero: homeHero,
      highlights: heroHighlights,
      search: searchConfig,
      tracks: trackCards,
      audiences: audienceColumns,
      steps: processSteps,
      cta: homeCta,
      faq: faqItems,
      sections: homeSections,
      cases: homeCases,
    };
  },
  getCompanyContent(): {
    hero: HeroContent;
    benefits: BenefitCard[];
    integrations: Integration[];
    caseStudy: CaseStudy;
    cards: typeof caseStudies;
  } {
    return {
      hero: companiesHero,
      benefits: companyBenefits,
      integrations: companyIntegrations,
      caseStudy: companyCase,
      cards: caseStudies,
    };
  },
  getTalentContent(): {
    hero: HeroContent;
    cards: BenefitCard[];
    path: { title: string; description: string }[];
  } {
    return {
      hero: talentsHero,
      cards: talentCards,
      path: growthPath,
    };
  },
  getPlatformContent(): {
    sources: string[];
    security: string[];
    roadmap: string[];
  } {
    return {
      sources: dataSources,
      security: securityPoints,
      roadmap: roadmapItems,
    };
  },
  getPricingContent(): {
    plans: PricingPlan[];
  } {
    return {
      plans: pricingPlans,
    };
  },
  getContactContent(): ContactContent {
    return contactContent;
  },
  getFaq(): FAQItem[] {
    return faqItems;
  },
};

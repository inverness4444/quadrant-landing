export type NavLink = {
  key: string;
  href: string;
  defaultLabel: string;
};

export type CTA = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
};

export type HeroContent = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  highlights?: string[];
  primaryCta: CTA;
  secondaryCta?: CTA;
  caption?: string;
};

export type Track = {
  id: string;
  title: string;
  description: string;
  tags: string[];
};

export type SearchConfig = {
  placeholder: string;
  tags: string[];
};

export type AudienceColumn = {
  title: string;
  points: string[];
  cta: CTA;
};

export type Step = {
  title: string;
  description: string;
};

export type FAQItem = {
  question: string;
  answer: string;
};

export type BenefitCard = {
  title: string;
  description: string;
};

export type Integration = {
  name: string;
};

export type CaseStudy = {
  title: string;
  summary: string[];
  cta: CTA;
};

export type PricingPlan = {
  name: string;
  audience: string;
  features: string[];
  note: string;
  ctaLabel: string;
};

export type FooterLinkGroup = {
  title: string;
  links: { label: string; href: string }[];
};

export type ContactContent = {
  title: string;
  subtitle: string;
  steps: string[];
};

export type SectionCopy = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

import type { FooterLinkGroup, NavLink } from "@/types/content";

export const mainNavigation: NavLink[] = [
  { key: "home", href: "/", defaultLabel: "Главная" },
  { key: "companies", href: "/companies", defaultLabel: "Для компаний" },
  { key: "talents", href: "/talents", defaultLabel: "Для специалистов" },
  { key: "demo", href: "/demo", defaultLabel: "Демо" },
  { key: "platform", href: "/platform", defaultLabel: "О платформе" },
  { key: "pricing", href: "/pricing", defaultLabel: "Цены" },
  { key: "contact", href: "/contact", defaultLabel: "Контакты" },
];

export const footerNavigation: FooterLinkGroup[] = [
  {
    title: "Продукт",
    links: [
      { label: "Главная", href: "/" },
      { label: "О платформе", href: "/platform" },
      { label: "Цены", href: "/pricing" },
      { label: "Кейсы", href: "/cases" },
    ],
  },
  {
    title: "Для компаний",
    links: [
      { label: "Выгоды", href: "/companies" },
      { label: "Интеграции", href: "/platform" },
      { label: "Запросить демо", href: "/contact" },
    ],
  },
  {
    title: "Для специалистов",
    links: [
      { label: "Как растём", href: "/talents" },
      { label: "FAQ", href: "/#faq" },
      { label: "Контакты", href: "/contact" },
    ],
  },
  {
    title: "Правовые",
    links: [
      { label: "Политика конфиденциальности", href: "/privacy" },
      { label: "Условия использования", href: "/terms" },
      { label: "Войти", href: "/login" },
    ],
  },
];

import Link from "next/link";
import { contentService } from "@/services/contentService";

export default function Footer() {
  const { footer } = contentService.getNavigation();
  const seenCombos = new Set<string>();
  const hrefCounters = new Map<string, number>();
  const quickLinks = footer
    .flatMap((group) => group.links)
    .filter((link) => {
      const comboKey = `${link.href}-${link.label}`;
      if (seenCombos.has(comboKey)) return false;
      seenCombos.add(comboKey);
      return true;
    })
    .slice(0, 6)
    .map((link) => {
      const counter = hrefCounters.get(link.href) ?? 0;
      hrefCounters.set(link.href, counter + 1);
      return {
        ...link,
        id: `${link.href}-${counter}`,
      };
    }); // уникальные id нужны для стабильных React key даже при повторе href
  return (
    <footer className="mt-16 border-t border-white/40 bg-white/50 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="space-y-3">
          <Link href="/" className="text-2xl font-semibold text-brand-text">
            Quadrant
          </Link>
          <p className="text-sm text-slate-500">
            Живой SaaS для картирования навыков, артефактов и карьерных треков. Quadrant помогает командам и специалистам принимать решения о росте.
          </p>
          <p className="text-sm text-slate-400">hello@quadrant.app</p>
        </div>
        <nav className="flex flex-wrap gap-4 text-sm text-slate-500">
          {quickLinks.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              className="transition hover:text-brand-text"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-white/50 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Quadrant. Все права защищены.
      </div>
    </footer>
  );
}

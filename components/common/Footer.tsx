import Link from "next/link";
import { contentService } from "@/services/contentService";

export default function Footer() {
  const { footer } = contentService.getNavigation();
  return (
    <footer className="border-t border-brand-border bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:justify-between lg:px-8">
        <div className="max-w-md">
          <p className="text-2xl font-semibold text-brand-text">Quadrant</p>
          <p className="mt-3 text-sm text-slate-600">
            Живая карта навыков и карьерных треков. Quadrant анализирует настоящие
            артефакты работы и помогает компаниям развивать внутренние таланты.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            hello@quadrant.app • +7 (999) 000-00-00
          </p>
        </div>
        <div className="grid flex-1 gap-6 text-sm text-slate-600 md:grid-cols-2 lg:grid-cols-4">
          {footer.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-semibold uppercase text-slate-500">
                {group.title}
              </p>
              <div className="mt-2 space-y-2">
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block transition hover:text-brand-text"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-brand-border py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Quadrant. Все права защищены.
      </div>
    </footer>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { contentService } from "@/services/contentService";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import { useDictionary } from "@/hooks/useDictionary";
import type { NavLink } from "@/types/content";

export type HeaderSessionState = {
  authenticated: boolean;
};

type HeaderProps = {
  initialSession?: HeaderSessionState | null;
  demoEnabled: boolean;
  demoHref: string;
};

const NAV_KEYS: ReadonlyArray<string> = ["home", "companies", "talents", "platform", "demo", "pricing", "contact"];
const NAVIGATION_CONTENT = contentService.getNavigation();
const BASE_NAV_ITEMS: NavLink[] = NAV_KEYS.map((key) =>
  NAVIGATION_CONTENT.header.find((item) => item.key === key),
).filter((item): item is NavLink => Boolean(item));

export default function Header({ initialSession, demoEnabled, demoHref }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<HeaderSessionState | null>(initialSession ?? null);
  const pathname = usePathname();
  const dict = useDictionary();
  const navItems = useMemo(() => {
    return BASE_NAV_ITEMS.filter((item) => item.key !== "demo" || demoEnabled).map((item) => {
      const label = dict.navigation[item.key as keyof typeof dict.navigation] ?? item.defaultLabel;
      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
      return { ...item, label, isActive };
    });
  }, [dict, pathname, demoEnabled]);

  const toggleMenu = () => setOpen((prev) => !prev);
  const closeMenu = () => setOpen(false);
  const isAuthenticated = Boolean(session?.authenticated);
  const primaryLabel = demoEnabled ? "Посмотреть демо" : "Оставить заявку";
  const primaryHref = demoHref;
  const secondaryHref = isAuthenticated ? "/app" : "/auth/login";
  const secondaryLabel = isAuthenticated ? dict.buttons.cabinet : dict.buttons.login;

  useEffect(() => {
    setSession(initialSession ?? null);
  }, [initialSession]);

  useEffect(() => {
    if (initialSession !== undefined) return;
    let active = true;
    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("session");
        }
        const data = (await response.json()) as HeaderSessionState;
        if (active) {
          setSession(data);
        }
      } catch {
        if (active) {
          setSession({ authenticated: false });
        }
      }
    };
    loadSession();
    return () => {
      active = false;
    };
  }, [initialSession]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/50 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 text-xl font-semibold text-brand-text"
          onClick={closeMenu}
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary to-brand-accent text-sm font-bold text-white shadow-lg">
            Q
          </span>
          Quadrant
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 lg:flex">
          {navItems.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={`relative transition ${
                item.isActive ? "text-brand-text" : "text-slate-500 hover:text-brand-text"
              }`}
            >
              {item.label}
              {item.isActive && (
                <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-brand-primary" aria-hidden />
              )}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher />
          <SecondaryButton href={secondaryHref}>{secondaryLabel}</SecondaryButton>
          <PrimaryButton href={primaryHref}>{primaryLabel}</PrimaryButton>
        </div>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/50 text-brand-text shadow-sm transition hover:scale-105 lg:hidden"
          onClick={toggleMenu}
          aria-label="Меню"
          aria-expanded={open}
        >
          <span className="relative block h-5 w-5">
            <span
              className={`absolute left-0 h-0.5 w-full bg-current transition ${
                open ? "translate-y-0 rotate-45" : "-translate-y-1.5"
              }`}
            />
            <span
              className={`absolute left-0 h-0.5 w-full bg-current transition ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 h-0.5 w-full bg-current transition ${
                open ? "translate-y-0 -rotate-45" : "translate-y-1.5"
              }`}
            />
          </span>
        </button>
      </div>
      {open && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-40 bg-brand-text/40 backdrop-blur-sm" onClick={closeMenu} />
          <div className="fixed inset-x-0 top-0 z-50 rounded-b-[2rem] border border-white/60 bg-white/95 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-brand-text">Меню</span>
              <button
                type="button"
                className="h-10 w-10 rounded-full border border-white/40"
                onClick={closeMenu}
                aria-label="Закрыть меню"
              >
                ×
              </button>
            </div>
            <nav className="mt-6 flex flex-col gap-2 text-base font-medium text-slate-700">
              {navItems.map((item) => (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  onClick={closeMenu}
                  className="rounded-2xl px-3 py-3 transition hover:bg-brand-muted"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-6 flex flex-col gap-3">
              <LanguageSwitcher className="flex items-center gap-2 text-xs font-semibold text-slate-500" />
              <SecondaryButton href={secondaryHref}>{secondaryLabel}</SecondaryButton>
              <PrimaryButton href={primaryHref}>{primaryLabel}</PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

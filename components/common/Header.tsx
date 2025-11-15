"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { contentService } from "@/services/contentService";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import { useDictionary } from "@/hooks/useDictionary";

export type HeaderSessionState = {
  authenticated: boolean;
};

type HeaderProps = {
  initialSession?: HeaderSessionState | null;
};

export default function Header({ initialSession }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<HeaderSessionState | null>(initialSession ?? null);
  const pathname = usePathname();
  const { header } = useMemo(() => contentService.getNavigation(), []);
  const dict = useDictionary();

  const toggleMenu = () => setOpen((prev) => !prev);
  const closeMenu = () => setOpen(false);
  const isAuthenticated = Boolean(session?.authenticated);

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
    <header className="border-b border-brand-border bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 text-2xl font-semibold text-brand-text"
          onClick={closeMenu}
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-sm font-bold text-white">
            Q
          </span>
          Quadrant
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 lg:flex">
          {header.map((item) => {
            const isActive = pathname === item.href;
            const label = dict.navigation[item.key as keyof typeof dict.navigation] ?? item.defaultLabel;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-1 pb-1 transition hover:text-brand-text ${
                  isActive
                    ? "text-brand-text after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-brand-primary"
                    : ""
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher />
          <SecondaryButton href={isAuthenticated ? "/app" : "/auth/login"} className="px-4 py-2">
            {isAuthenticated ? dict.buttons.cabinet : dict.buttons.login}
          </SecondaryButton>
          <PrimaryButton href="/auth/register" className="px-4 py-2">
            {dict.buttons.requestDemo}
          </PrimaryButton>
        </div>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand-border text-brand-text transition hover:border-brand-primary lg:hidden"
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
        <div className="border-t border-brand-border bg-white shadow lg:hidden">
          <nav className="flex flex-col gap-3 px-4 py-4 text-base font-medium text-slate-700">
            {header.map((item) => {
              const label =
                dict.navigation[item.key as keyof typeof dict.navigation] ??
                item.defaultLabel;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className="rounded-lg px-2 py-2 transition hover:bg-brand-muted"
                >
                  {label}
                </Link>
              );
            })}
            <LanguageSwitcher className="flex items-center gap-2 text-xs font-semibold text-slate-500" />
            <SecondaryButton href={isAuthenticated ? "/app" : "/auth/login"}>
              {isAuthenticated ? dict.buttons.cabinet : dict.buttons.login}
            </SecondaryButton>
            <PrimaryButton href="/auth/register">{dict.buttons.requestDemo}</PrimaryButton>
          </nav>
        </div>
      )}
    </header>
  );
}

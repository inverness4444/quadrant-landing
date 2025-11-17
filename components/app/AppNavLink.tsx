"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type AppNavLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "sidebar" | "pill";
};

export default function AppNavLink({ href, children, variant = "sidebar" }: AppNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  if (variant === "pill") {
    return (
      <Link
        href={href}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          isActive ? "bg-brand-primary text-white" : "bg-white text-slate-600 hover:text-brand-text"
        }`}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`block rounded-xl px-3 py-2 text-sm font-semibold transition ${
        isActive ? "bg-brand-primary/10 text-brand-text" : "text-slate-600 hover:bg-brand-muted"
      }`}
    >
      {children}
    </Link>
  );
}

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getUserWithWorkspace } from "@/services/auth/authService";
import { getUserIdFromCookies } from "@/lib/session";
import PrimaryButton from "@/components/common/PrimaryButton";
import AppNavLink from "@/components/app/AppNavLink";
import { seedWorkspaceDemoData } from "@/services/workspaceSeed";

const navLinks = [
  { label: "Обзор", href: "/app" },
  { label: "Команда", href: "/app/team" },
  { label: "Навыки", href: "/app/skills" },
  { label: "Треки", href: "/app/tracks" },
  { label: "Настройки", href: "/app/settings" },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const userId = await getUserIdFromCookies();
  if (!userId) redirect("/auth/login");
  const context = await getUserWithWorkspace(userId);
  if (!context) redirect("/auth/login");
  await seedWorkspaceDemoData(context.workspace.id);

  return (
    <div className="flex min-h-screen bg-brand-muted">
      <aside className="hidden w-64 flex-col border-r border-brand-border bg-white p-6 text-sm text-slate-600 lg:flex">
        <p className="text-xs uppercase text-slate-400">Навигация</p>
        <nav className="mt-4 space-y-2">
          {navLinks.map((link) => (
            <AppNavLink key={link.href} href={link.href}>
              {link.label}
            </AppNavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1">
        <nav className="flex flex-wrap gap-2 border-b border-brand-border bg-white px-4 py-3 lg:hidden">
          {navLinks.map((link) => (
            <AppNavLink key={link.href} href={link.href} variant="pill">
              {link.label}
            </AppNavLink>
          ))}
        </nav>
        <header className="flex flex-col gap-3 border-b border-brand-border bg-white px-4 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase text-slate-400">Компания</p>
            <p className="text-base font-semibold text-brand-text">{context.workspace.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span>Привет, {context.user.name || context.user.email}</span>
            <form action="/auth/logout" method="post">
              <PrimaryButton type="submit" className="px-4 py-2 text-sm">
                Выйти
              </PrimaryButton>
            </form>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

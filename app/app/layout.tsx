import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getUserIdFromCookies } from "@/lib/session";
import { seedWorkspaceDemoData } from "@/services/workspaceSeed";
import AppShell, { AppNavLinkConfig } from "@/components/app/layout/AppShell";
import { listRiskCases } from "@/services/riskCenterService";
import { getAppContext } from "@/services/appContext";
import { isAdmin, isOwner } from "@/services/rbac";
import { isFeatureEnabled } from "@/services/featureFlags";

const baseNavLinks: AppNavLinkConfig[] = [
  { label: "Мой кабинет", href: "/app/me", icon: "dashboard" },
  { label: "Обзор", href: "/app", icon: "dashboard" },
  { label: "Рабочий стол", href: "/app/manager/agenda", icon: "team" },
  { label: "Настройка", href: "/app/setup", icon: "settings" },
  { label: "Программы", href: "/app/programs", icon: "quests" },
  { label: "Команда", href: "/app/team", icon: "team" },
  { label: "Навыки и роли", href: "/app/skills", icon: "skills" },
  { label: "Skills & Gaps", href: "/app/skills/map", icon: "skills" },
  { label: "Артефакты", href: "/app/artifacts", icon: "artifacts" },
  { label: "Интеграции", href: "/app/integrations", icon: "integrations" },
  { label: "Треки", href: "/app/tracks", icon: "tracks" },
  { label: "Квесты", href: "/app/quests", icon: "quests" },
  { label: "Моё развитие", href: "/app/my/quests", icon: "growth" },
  { label: "Оценки навыков", href: "/app/assessments", icon: "assessments" },
  { label: "Решения", href: "/app/moves", icon: "moves" },
  { label: "Решения по людям", href: "/app/decisions", icon: "moves" },
  { label: "Повестка", href: "/app/agenda", icon: "analytics" },
  { label: "Risk Center", href: "/app/risk-center", icon: "risk" },
  { label: "Пилоты", href: "/app/pilots", icon: "pilot" },
  { label: "Шаблоны пилотов", href: "/app/pilots/templates", icon: "pilot" },
  { label: "Аналитика", href: "/app/analytics", icon: "analytics" },
  { label: "Отчёты", href: "/app/reports", icon: "reports" },
  { label: "Командный центр", href: "/app/manager", icon: "team" },
  { label: "Quarterly report", href: "/app/reports/quarterly", icon: "reports" },
  { label: "Настройки", href: "/app/settings", icon: "settings" },
] as const;

export default async function AppLayout({ children }: { children: ReactNode }) {
  const userId = await getUserIdFromCookies();
  if (!userId) redirect("/auth/login");
  const context = await getAppContext(userId);
  if (!context) redirect("/auth/login");
  try {
    await seedWorkspaceDemoData(context.workspace.id);
  } catch (error) {
    console.error("seedWorkspaceDemoData failed", error);
  }
  let riskBadge: number | string | undefined;
  try {
    const summary = await listRiskCases({ workspaceId: context.workspace.id, statuses: ["open", "monitoring"], limit: 1 });
    riskBadge = summary.highCount > 0 ? `${summary.openCount}/${summary.highCount}` : summary.openCount;
  } catch {
    riskBadge = undefined;
  }

  const allowAnalytics = isOwner(context.member) || isAdmin(context.member);
  const navLinks = baseNavLinks
    .filter((link) => {
      if (link.href === "/app/setup" && !(isOwner(context.member) || isAdmin(context.member))) return false;
      if (link.href.startsWith("/app/analytics") && (!allowAnalytics || !isFeatureEnabled("analyticsEnabled"))) return false;
      if (link.href.startsWith("/app/pilots") && !isFeatureEnabled("pilotsEnabled")) return false;
      if (link.href.startsWith("/app/feedback") && !isFeatureEnabled("feedbackEnabled")) return false;
      if (link.href.startsWith("/app/reports/quarterly") && !isFeatureEnabled("quarterlyReportsEnabled")) return false;
      if (link.href.startsWith("/app/one-on-ones") && !isFeatureEnabled("oneOnOnesEnabled")) return false;
      return true;
    })
    .map((link) => (link.href === "/app/risk-center" ? { ...link, badge: riskBadge } : link));

  return (
    <AppShell
      workspaceName={context.workspace.name}
      userName={context.user.name}
      userEmail={context.user.email}
      navLinks={navLinks}
    >
      {children}
    </AppShell>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import Card from "@/components/common/Card";

type NavIcon =
  | "dashboard"
  | "team"
  | "skills"
  | "artifacts"
  | "integrations"
  | "tracks"
  | "pilot"
  | "quests"
  | "growth"
  | "assessments"
  | "moves"
  | "risk"
  | "analytics"
  | "reports"
  | "settings";

export type AppNavIcon = NavIcon;
export type AppNavLinkConfig = {
  href: string;
  label: string;
  icon: NavIcon;
  badge?: number | string;
};

type AppShellProps = {
  workspaceName: string;
  userName: string | null;
  userEmail: string;
  navLinks: AppNavLinkConfig[];
  children: ReactNode;
};

export default function AppShell({ workspaceName, userName, userEmail, navLinks, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; body: string; url: string | null; createdAt: string }>
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const initials = useMemo(() => buildInitials(userName || userEmail), [userName, userEmail]);

  const loadNotifications = async () => {
    try {
      const response = await fetch("/api/app/notifications?onlyUnread=true&limit=10", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) return;
      setNotifications(payload.notifications ?? []);
      setUnreadCount(payload.unreadCount ?? payload.notifications?.length ?? 0);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  const openNotification = async (notification: { id: string; url: string | null }) => {
    try {
      await fetch(`/api/app/notifications/${notification.id}/read`, { method: "POST" });
      await loadNotifications();
    } catch {
      // silent
    }
    if (notification.url) {
      router.push(notification.url);
    }
    setNotifOpen(false);
  };

  const markAllRead = async () => {
    await fetch("/api/app/notifications", { method: "PATCH" });
    await loadNotifications();
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  const renderNav = () => (
    <nav className="space-y-2">
      {navLinks.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={`${link.href}-${link.label}`}
            href={link.href}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition ${
              active ? "bg-brand-primary/10 text-brand-text" : "text-slate-500 hover:bg-white/70"
            }`}
          >
            <Icon type={link.icon} active={active} />
            <span className="flex-1">{link.label}</span>
            {link.badge !== undefined && (
              <span
                className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  active ? "bg-brand-primary/20 text-brand-primary" : "bg-slate-100 text-slate-600"
                }`}
              >
                {link.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-brand-muted">
      <aside className="hidden w-64 flex-col border-r border-white/60 bg-white/80 px-5 py-6 lg:flex">
        <Link href="/" className="text-2xl font-semibold text-brand-text">
          Quadrant
        </Link>
        <div className="mt-8 flex-1 overflow-y-auto">{renderNav()}</div>
        <div className="text-xs text-slate-400">{userEmail}</div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-brand-text/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 border-r border-white/60 bg-white/95 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-brand-text">Навигация</span>
              <button
                type="button"
                className="h-10 w-10 rounded-full border border-white/50"
                onClick={() => setSidebarOpen(false)}
                aria-label="Закрыть меню"
              >
                ×
              </button>
            </div>
            <div className="mt-6">{renderNav()}</div>
          </div>
        </div>
      )}

      <main className="flex-1">
        <header className="border-b border-white/60 bg-white/70 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-4 lg:px-8">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Workspace</p>
              <h1 className="text-xl font-semibold text-brand-text">{workspaceName}</h1>
            </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              className="relative rounded-full border border-white/60 p-2 text-brand-text"
              onClick={() => setNotifOpen((prev) => !prev)}
              aria-label="Уведомления"
            >
              <BellIcon />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-primary px-1 text-[10px] font-semibold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <Card className="absolute right-0 top-12 z-30 w-80 space-y-2 border border-white/70 bg-white/95 p-3 shadow-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Уведомления</p>
                {notifications.length === 0 ? (
                  <p className="text-sm text-slate-500">Нет новых уведомлений</p>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        className="w-full text-left"
                        onClick={() => void openNotification(notification)}
                      >
                        <div className="rounded-xl border border-brand-border/60 bg-white px-3 py-2 text-sm text-slate-700">
                          <p className="font-semibold text-brand-text">{notification.title}</p>
                          <p className="line-clamp-3 text-xs text-slate-500">{notification.body}</p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {new Date(notification.createdAt).toLocaleString("ru-RU")}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <button type="button" className="text-brand-primary" onClick={() => router.push("/app/notifications")}>
                    Показать все
                  </button>
                  <button type="button" className="text-slate-500" onClick={() => void markAllRead()}>
                    Отметить как прочитанные
                  </button>
                </div>
              </Card>
            )}
          </div>
          <button
            type="button"
            className="rounded-full border border-white/60 p-2 text-brand-text lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Меню"
              >
                ☰
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-primary/10 text-sm font-semibold text-brand-primary"
                  aria-haspopup="menu"
                  aria-expanded={profileMenuOpen}
                >
                  {initials}
                </button>
                {profileMenuOpen && (
                  <div className="absolute right-0 top-12 z-30 w-56 rounded-2xl border border-white/60 bg-white/95 p-4 shadow-2xl">
                    <p className="text-sm font-semibold text-brand-text">{userName || userEmail}</p>
                    <p className="text-xs text-slate-500">{userEmail}</p>
                    <form action="/auth/logout" method="post" className="mt-4">
                      <button
                        type="submit"
                        className="w-full rounded-full border border-brand-border px-4 py-2 text-sm font-semibold text-center text-brand-text transition hover:border-brand-primary"
                      >
                        Выйти
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <div className="p-6 lg:p-10">{children}</div>
      </main>
    </div>
  );
}

function buildInitials(value: string) {
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Icon({ type, active }: { type: NavIcon; active: boolean }) {
  const common = "h-4 w-4 transition";
  const color = active ? "text-brand-primary" : "text-slate-400";
  switch (type) {
    case "dashboard":
      return (
        <svg viewBox="0 0 24 24" className={`${common} ${color}`} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 6h7v7H4zM13 6h7v5h-7zM13 13h7v5h-7zM4 15h7v3H4z" />
        </svg>
      );
    case "team":
      return (
        <svg viewBox="0 0 24 24" className={`${common} ${color}`} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 11a3 3 0 100-6 3 3 0 000 6zM16 11a3 3 0 100-6 3 3 0 000 6zM3 19a5 5 0 015-5h0a5 5 0 015 5v1H3zM13 20v-1a5 5 0 015-5h0a5 5 0 015 5v1z" />
        </svg>
      );
    case "skills":
      return (
        <svg viewBox="0 0 24 24" className={`${common} ${color}`} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 7h16M4 12h10M4 17h7" />
          <circle cx="18" cy="12" r="2" />
        </svg>
      );
    case "tracks":
      return (
        <svg viewBox="0 0 24 24" className={`${common} ${color}`} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 18l6-12 6 12" />
          <path d="M8 14h8" />
        </svg>
      );
    case "analytics":
      return (
        <svg viewBox="0 0 24 24" className={`${common} ${color}`} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 20h16" />
          <path d="M6 20V9" />
          <path d="M12 20V4" />
          <path d="M18 20v-7" />
          <circle cx="12" cy="4" r="1.5" fill="currentColor" />
          <circle cx="6" cy="9" r="1.2" fill="currentColor" />
          <circle cx="18" cy="13" r="1.2" fill="currentColor" />
        </svg>
      );
    case "artifacts":
      return (
        <svg viewBox="0 0 24 24" className={`${common} ${color}`} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 4h12v16H6z" />
          <path d="M10 8h4M10 12h4M10 16h4" />
        </svg>
      );
    case "integrations":
      return (
        <svg viewBox="0 0 24 24" className={`${common} ${color}`} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M7 7h10v10H7z" />
          <path d="M4 12h3M17 12h3M12 4v3M12 17v3" />
        </svg>
      );
    case "pilot":
      return (
        <svg viewBox="0 0 24 24" className={`${common} ${color}`} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 18h16" />
          <path d="M6 18V6" />
          <path d="M6 10h6" />
          <path d="M12 14l4-8h2" />
          <circle cx="6" cy="18" r="1.2" fill="currentColor" />
          <circle cx="12" cy="18" r="1.2" fill="currentColor" />
          <circle cx="18" cy="18" r="1.2" fill="currentColor" />
        </svg>
      );
    case "quests":
      return (
        <svg viewBox="0 0 24 24" className={`${common} ${color}`} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 5h12l4 4v10H4z" />
          <path d="M8 9h6" />
          <path d="M8 13h8" />
          <path d="M8 17h5" />
          <circle cx="8" cy="9" r="1.2" fill="currentColor" />
        </svg>
      );
    case "growth":
      return (
        <svg viewBox="0 0 24 24" className={`${common} ${color}`} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 12l5 5 11-11" />
          <path d="M10 7h4v4" />
        </svg>
      );
    case "assessments":
      return (
        <svg viewBox="0 0 24 24" className={`${common} ${color}`} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M5 5h14v14H5z" />
          <path d="M9 9h6M9 13h4M9 17h3" />
          <circle cx="8" cy="9" r="1" fill="currentColor" />
          <circle cx="8" cy="13" r="1" fill="currentColor" />
          <circle cx="8" cy="17" r="1" fill="currentColor" />
        </svg>
      );
    case "moves":
      return (
        <svg viewBox="0 0 24 24" className={`${common} ${color}`} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 12h16M12 4l-3 3M12 4l3 3M12 20l-3-3M12 20l3-3" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case "risk":
      return (
        <svg viewBox="0 0 24 24" className={`${common} ${color}`} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 3l9 18H3z" />
          <path d="M12 9v5" />
          <circle cx="12" cy="17" r="1" fill="currentColor" />
        </svg>
      );
    case "reports":
      return (
        <svg viewBox="0 0 24 24" className={`${common} ${color}`} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 3h9l5 5v13H6z" />
          <path d="M15 3v5h5" />
          <path d="M9 12h6" />
          <path d="M9 16h4" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" className={`${common} ${color}`} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 15.5A3.5 3.5 0 1112 8.5a3.5 3.5 0 010 7z" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.18A1.65 1.65 0 0019.4 15z" />
        </svg>
      );
    default:
      return null;
  }
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3a6 6 0 00-6 6v3.5L4 15v1h16v-1l-2-2.5V9a6 6 0 00-6-6z" />
      <path d="M10 19a2 2 0 004 0" />
    </svg>
  );
}

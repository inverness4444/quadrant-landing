 "use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Header, { type HeaderSessionState } from "@/components/common/Header";
import Footer from "@/components/common/Footer";

type LayoutProps = {
  children: ReactNode;
  session?: HeaderSessionState | null;
  demoEnabled: boolean;
  demoHref: string;
};

export default function Layout({ children, session, demoEnabled, demoHref }: LayoutProps) {
  const pathname = usePathname() || "/";
  const isAppShell = pathname.startsWith("/app") || pathname.startsWith("/auth");

  if (isAppShell) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col font-sans text-brand-text">
      <Header initialSession={session} demoEnabled={demoEnabled} demoHref={demoHref} />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

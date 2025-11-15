 "use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Header, { type HeaderSessionState } from "@/components/common/Header";
import Footer from "@/components/common/Footer";

type LayoutProps = {
  children: ReactNode;
  session?: HeaderSessionState | null;
};

export default function Layout({ children, session }: LayoutProps) {
  const pathname = usePathname() || "/";
  const isAppShell = pathname.startsWith("/app") || pathname.startsWith("/auth");

  if (isAppShell) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-muted font-sans text-brand-text">
      <Header initialSession={session} />
      <main className="flex-1 bg-brand-muted">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

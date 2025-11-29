import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Layout from "@/components/common/Layout";
import AnalyticsScripts from "@/components/common/AnalyticsScripts";
import PwaRegister from "@/components/common/PwaRegister";
import { getUserIdFromCookies } from "@/lib/session";
import { getUserWithWorkspace } from "@/services/auth/authService";
import type { HeaderSessionState } from "@/components/common/Header";
import { env } from "@/config/env";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Quadrant — живая карта навыков",
  description:
    "Quadrant анализирует реальные артефакты работы и помогает компаниям строить честные карьерные треки.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getInitialSession();
  const demoEnabled = Boolean(env.demo.enabled);
  const demoHref = demoEnabled ? "/auth/demo-login" : "/contact";
  return (
    <html lang="ru">
      <body className={`${inter.variable} min-h-screen bg-transparent antialiased`}>
        <AnalyticsScripts />
        <PwaRegister />
        <Layout session={session} demoEnabled={demoEnabled} demoHref={demoHref}>
          {children}
        </Layout>
      </body>
    </html>
  );
}

async function getInitialSession(): Promise<HeaderSessionState | null> {
  const userId = await getUserIdFromCookies();
  if (!userId) {
    return { authenticated: false };
  }
  const context = await getUserWithWorkspace(userId);
  if (!context) {
    return { authenticated: false };
  }
  return { authenticated: true };
}

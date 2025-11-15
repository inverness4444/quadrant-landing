import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Layout from "@/components/common/Layout";
import AnalyticsScripts from "@/components/common/AnalyticsScripts";
import PwaRegister from "@/components/common/PwaRegister";
import { getUserIdFromCookies } from "@/lib/session";
import { getUserWithWorkspace } from "@/services/auth/authService";
import type { HeaderSessionState } from "@/components/common/Header";
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
  return (
    <html lang="ru">
      <body className={`${inter.variable} bg-brand-muted antialiased`}>
        <AnalyticsScripts />
        <PwaRegister />
        <Layout session={session}>{children}</Layout>
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

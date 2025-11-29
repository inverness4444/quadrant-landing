import { redirect } from "next/navigation";
import QuarterlyReportClient from "@/components/app/reports/QuarterlyReportClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";

export default async function QuarterlyReportPage() {
  const context = await requireWorkspaceContext();
  if (!context) {
    redirect("/auth/login");
  }
  return <QuarterlyReportClient />;
}

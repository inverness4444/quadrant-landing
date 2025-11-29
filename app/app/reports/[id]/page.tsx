import { notFound, redirect } from "next/navigation";
import ReportClient from "@/components/app/reports/ReportClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { getReportById } from "@/services/reportService";
import { hasRole } from "@/services/rbac";

type PageParams = { params: Promise<{ id: string }> };

export default async function ReportPage({ params }: PageParams) {
  const { id } = await params;
  const { workspace, member, user } = await requireWorkspaceContext();
  if (!hasRole(member, ["owner", "admin"])) {
    redirect("/app");
  }
  const report = await getReportById(id, workspace.id);
  if (!report) {
    return notFound();
  }
  return <ReportClient report={report} currentUserId={user.id} workspaceId={workspace.id} />;
}

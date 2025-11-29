import AnalyticsClient from "@/components/app/analytics/AnalyticsClient";
import { redirect } from "next/navigation";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { isAdmin, isOwner } from "@/services/rbac";

export default async function AnalyticsPage() {
  const { workspace, member } = await requireWorkspaceContext();
  if (!isOwner(member) && !isAdmin(member)) {
    redirect("/app");
  }
  return <AnalyticsClient workspaceName={workspace.name} />;
}

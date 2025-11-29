import DashboardClient from "@/components/app/dashboard/DashboardClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";

export default async function DashboardPage() {
  const { workspace } = await requireWorkspaceContext();
  return <DashboardClient workspaceName={workspace.name} />;
}

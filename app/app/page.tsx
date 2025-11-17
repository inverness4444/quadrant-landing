import { requireWorkspaceContext } from "@/lib/workspaceContext";
import DashboardClient from "@/components/app/dashboard/DashboardClient";
import { hasRole } from "@/services/rbac";

export default async function Page() {
  const { workspace, member } = await requireWorkspaceContext();
  const canManageBilling = hasRole(member, ["owner", "admin"]);
  return <DashboardClient workspaceName={workspace.name} canManageBilling={canManageBilling} />;
}

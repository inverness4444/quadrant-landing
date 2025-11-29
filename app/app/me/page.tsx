import EmployeeHomeClient from "@/components/app/me/EmployeeHomeClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";

export default async function EmployeeHomePage() {
  const { user, workspace } = await requireWorkspaceContext();
  return <EmployeeHomeClient userName={user.name ?? user.email ?? "Ты"} workspaceName={workspace.name} />;
}


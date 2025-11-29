import CompanyHealthClient from "@/components/app/analytics/CompanyHealthClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { isAdmin, isOwner } from "@/services/rbac";
import { redirect } from "next/navigation";

export default async function CompanyHealthPage() {
  const { workspace, member } = await requireWorkspaceContext();
  if (!isOwner(member) && !isAdmin(member)) {
    redirect("/app");
  }
  return <CompanyHealthClient workspaceName={workspace.name} />;
}


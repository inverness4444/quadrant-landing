import { redirect } from "next/navigation";
import SetupWizard from "@/components/app/onboarding/SetupWizard";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { isAdmin, isOwner } from "@/services/rbac";

export default async function SetupPage() {
  const { workspace, member } = await requireWorkspaceContext();
  if (!isOwner(member) && !isAdmin(member)) {
    redirect("/app");
  }
  return <SetupWizard workspaceName={workspace.name} />;
}

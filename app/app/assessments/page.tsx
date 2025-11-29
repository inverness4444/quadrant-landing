import AssessmentsAdminClient from "@/components/app/assessments/AssessmentsAdminClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { getWorkspaceCycles } from "@/services/assessmentService";

export default async function AssessmentsPage() {
  const { workspace, user } = await requireWorkspaceContext();
  const cycles = await getWorkspaceCycles(workspace.id);
  return <AssessmentsAdminClient workspaceName={workspace.name} initialCycles={cycles} currentUserId={user.id} />;
}

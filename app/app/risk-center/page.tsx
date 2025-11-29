import RiskCenterClient from "@/components/app/risk-center/RiskCenterClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";

export default async function RiskCenterPage({
  searchParams,
}: {
  searchParams?: { caseId?: string };
}) {
  const { workspace, user } = await requireWorkspaceContext();
  return (
    <RiskCenterClient
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      currentUserId={user.id}
      initialCaseId={searchParams?.caseId}
    />
  );
}

import { redirect } from "next/navigation";
import PilotRunsDashboardClient from "@/components/app/pilot/PilotRunsDashboardClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { getWorkspacePilotRuns } from "@/services/pilotService";
import { listTracks } from "@/repositories/trackRepository";
import { hasRole } from "@/services/rbac";

export default async function PilotRunsPage() {
  const { workspace, member } = await requireWorkspaceContext();
  if (!hasRole(member, ["owner", "admin"])) {
    redirect("/app");
  }
  const [runs, teams] = await Promise.all([getWorkspacePilotRuns(workspace.id), listTracks(workspace.id)]);
  return (
    <PilotRunsDashboardClient
      workspaceName={workspace.name}
      initialRuns={runs}
      teams={teams.map((team) => ({ id: team.id, name: team.name }))}
    />
  );
}

import { redirect } from "next/navigation";
import MovesDashboardClient from "@/components/app/moves/MovesDashboardClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { getWorkspaceJobRoles, getWorkspaceMoveScenarios } from "@/services/movesService";
import { getWorkspacePilotRuns } from "@/services/pilotService";

export default async function MovesPage() {
  const context = await requireWorkspaceContext();
  if (context.member.role !== "owner" && context.member.role !== "admin") {
    redirect("/app");
  }
  const [roles, scenarios, pilots] = await Promise.all([
    getWorkspaceJobRoles(context.workspace.id),
    getWorkspaceMoveScenarios(context.workspace.id),
    getWorkspacePilotRuns(context.workspace.id),
  ]);
  const activePilot = pilots.find((pilot) => pilot.status === "active") ?? pilots[0] ?? null;
  return (
    <MovesDashboardClient
      workspaceName={context.workspace.name}
      initialRoles={roles}
      initialScenarios={scenarios}
      activePilot={activePilot ?? undefined}
    />
  );
}

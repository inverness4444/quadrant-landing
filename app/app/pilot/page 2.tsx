import PilotClient from "@/components/app/pilot/PilotClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { getPilotWithSteps } from "@/services/pilotService";

export default async function PilotPage() {
  const { workspace } = await requireWorkspaceContext();
  const summary = await getPilotWithSteps(workspace.id);
  return <PilotClient initialPilot={summary.pilot} initialSteps={summary.steps} />;
}

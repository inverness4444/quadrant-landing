import PilotDetailClient from "@/components/app/pilots/PilotDetailClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { getPilotById } from "@/services/pilotProgramService";

export default async function PilotDetailPage({ params }: { params: { id: string } }) {
  const { workspace } = await requireWorkspaceContext();
  const data = await getPilotById({ workspaceId: workspace.id, pilotId: params.id });
  return <PilotDetailClient initialPilot={data.pilot} initialParticipants={data.participants} />;
}

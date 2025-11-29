import PilotsPageClient from "@/components/app/pilots/PilotsPageClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { listPilots } from "@/services/pilotProgramService";

export default async function PilotsPage() {
  const { workspace } = await requireWorkspaceContext();
  const initial = await listPilots({ workspaceId: workspace.id, status: "active", limit: 50 });
  return <PilotsPageClient workspaceName={workspace.name} initialItems={initial.items} total={initial.total} />;
}

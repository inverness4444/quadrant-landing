import { notFound, redirect } from "next/navigation";
import PilotRunClient from "@/components/app/pilot/PilotRunClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { getPilotRunById } from "@/services/pilotService";
import { getWorkspaceCycles } from "@/services/assessmentService";
import { hasRole } from "@/services/rbac";

type PageParams = {
  params: Promise<{ id: string }>;
};

export default async function PilotRunPage({ params }: PageParams) {
  const { id } = await params;
  const { workspace, member } = await requireWorkspaceContext();
  if (!hasRole(member, ["owner", "admin"])) {
    redirect("/app");
  }
  const run = await getPilotRunById(id, workspace.id);
  if (!run) {
    return notFound();
  }
  const cycles = await getWorkspaceCycles(workspace.id);
  return <PilotRunClient pilotRun={run} cycles={cycles} />;
}

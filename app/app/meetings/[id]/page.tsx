import { notFound, redirect } from "next/navigation";
import MeetingAgendaClient from "@/components/app/meetings/MeetingAgendaClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { getAgendaById } from "@/services/meetingService";
import { hasRole } from "@/services/rbac";

type PageParams = { params: Promise<{ id: string }> };

export default async function MeetingPage({ params }: PageParams) {
  const { id } = await params;
  const { workspace, member } = await requireWorkspaceContext();
  if (!hasRole(member, ["owner", "admin"])) {
    redirect("/app");
  }
  const agenda = await getAgendaById(id, workspace.id);
  if (!agenda) return notFound();
  return <MeetingAgendaClient agenda={agenda} workspaceId={workspace.id} />;
}

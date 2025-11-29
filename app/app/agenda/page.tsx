import AgendaClient from "@/components/app/agenda/AgendaClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";

export default async function AgendaPage() {
  await requireWorkspaceContext();
  return <AgendaClient />;
}

import QuestsManagerClient from "@/components/app/quests/QuestsManagerClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { getWorkspaceQuests } from "@/services/questService";

export default async function QuestsPage() {
  const { workspace } = await requireWorkspaceContext();
  const quests = await getWorkspaceQuests(workspace.id, {});
  return <QuestsManagerClient initialQuests={quests} />;
}

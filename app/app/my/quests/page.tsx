import MyQuestsClient from "@/components/app/quests/MyQuestsClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";

export default async function MyQuestsPage() {
  await requireWorkspaceContext();
  return <MyQuestsClient />;
}

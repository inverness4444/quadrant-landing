import OneOnOneDetailClient from "@/components/app/one-on-ones/OneOnOneDetailClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { getOneOnOneById } from "@/services/oneOnOneService";

export default async function OneOnOneDetailPage({ params }: { params: { id: string } }) {
  const { workspace, member } = await requireWorkspaceContext();
  const data = await getOneOnOneById({ workspaceId: workspace.id, oneOnOneId: params.id, managerId: member.userId });
  if (!data) return <div className="p-6">Встреча не найдена</div>;
  return <OneOnOneDetailClient initial={data} />;
}

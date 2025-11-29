import MyQuestDetailClient from "@/components/app/quests/MyQuestDetailClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";

type PageParams = {
  params: Promise<{ id: string }>;
};

export default async function MyQuestDetailPage({ params }: PageParams) {
  await requireWorkspaceContext();
  const { id } = await params;
  return <MyQuestDetailClient assignmentId={id} />;
}

import ArtifactsClient from "@/components/app/artifacts/ArtifactsClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";

export default async function ArtifactsPage() {
  await requireWorkspaceContext();
  return <ArtifactsClient />;
}

import OneOnOnesClient from "@/components/app/one-on-ones/OneOnOnesClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";

export default async function OneOnOnesPage() {
  await requireWorkspaceContext();
  return <OneOnOnesClient />;
}

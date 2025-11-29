import ManagerCommandCenterClient from "@/components/app/manager/ManagerCommandCenterClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";

export default async function ManagerPage({ searchParams }: { searchParams?: { focus?: string } }) {
  await requireWorkspaceContext();
  return <ManagerCommandCenterClient focus={searchParams?.focus} />;
}

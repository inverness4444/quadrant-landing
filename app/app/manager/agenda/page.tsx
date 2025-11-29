import ManagerAgendaClient from "@/components/app/manager/ManagerAgendaClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { redirect } from "next/navigation";

export default async function ManagerAgendaPage() {
  const { member } = await requireWorkspaceContext();
  if (!member || member.role === "member") {
    redirect("/app");
  }
  return <ManagerAgendaClient />;
}


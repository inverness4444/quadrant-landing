import TeamHealthClient from "@/components/app/manager/TeamHealthClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { redirect } from "next/navigation";

export default async function TeamHealthPage() {
  const { member } = await requireWorkspaceContext();
  if (!member || member.role === "member") {
    redirect("/app");
  }
  return <TeamHealthClient />;
}


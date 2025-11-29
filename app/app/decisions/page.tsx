import { redirect } from "next/navigation";
import TalentDecisionsClient from "@/components/app/decisions/TalentDecisionsClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";

export default async function DecisionsPage() {
  const context = await requireWorkspaceContext();
  if (context.member.role !== "owner" && context.member.role !== "admin") {
    redirect("/app");
  }
  return <TalentDecisionsClient />;
}

import StaffingClient from "@/components/app/analytics/StaffingClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { listSkills } from "@/repositories/skillRepository";

export default async function StaffingPage() {
  const { workspace } = await requireWorkspaceContext();
  const skills = await listSkills(workspace.id);
  return <StaffingClient skills={skills} />;
}

import PilotWizardNewClient from "@/components/app/pilots/PilotWizardNewClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";

export default async function PilotWizardPage() {
  await requireWorkspaceContext();
  return <PilotWizardNewClient />;
}

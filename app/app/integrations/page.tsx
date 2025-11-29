import IntegrationsClient from "@/components/app/integrations/IntegrationsClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";

export default async function IntegrationsPage() {
  await requireWorkspaceContext();
  return <IntegrationsClient />;
}

import SettingsClient from "@/components/app/settings/SettingsClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";

export default async function SettingsPage() {
  const context = await requireWorkspaceContext();
  return <SettingsClient workspace={context.workspace} user={context.user} />;
}

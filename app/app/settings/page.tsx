import SettingsClient, { type SettingsTab } from "@/components/app/settings/SettingsClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";

type SettingsPageSearchParams = {
  tab?: string | string[];
};

const TAB_ALIASES: Record<string, SettingsTab> = {
  general: "general",
  company: "general",
  profile: "general",
  security: "security",
  participants: "security",
  integrations: "integrations",
  billing: "billing",
};

export default async function SettingsPage({ searchParams }: { searchParams?: SettingsPageSearchParams }) {
  const context = await requireWorkspaceContext();
  const rawTab = Array.isArray(searchParams?.tab) ? searchParams?.tab[0] : searchParams?.tab;
  const initialTab = rawTab ? TAB_ALIASES[rawTab] ?? "general" : "general";
  return (
    <SettingsClient
      workspace={context.workspace}
      user={context.user}
      member={context.member}
      initialTab={initialTab}
    />
  );
}

import { notFound } from "next/navigation";
import RoleSkillGapClient from "@/components/app/roles/RoleSkillGapClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { db } from "@/lib/db";
import { roleProfiles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export default async function RoleSkillGapPage({ params }: Params) {
  const { workspace } = await requireWorkspaceContext();
  const { id } = await params;
  const rows = await db.select().from(roleProfiles).where(eq(roleProfiles.id, id)).where(eq(roleProfiles.workspaceId, workspace.id));
  const role = rows[0];
  if (!role) return notFound();
  return <RoleSkillGapClient roleId={role.id} roleName={role.name} />;
}

import { findUserById } from "@/repositories/userRepository";
import { findWorkspaceById } from "@/repositories/workspaceRepository";
import { findMemberByUserId } from "@/repositories/memberRepository";
import type { Member, User, Workspace } from "@/drizzle/schema";

export type AppContext = {
  user: User;
  workspace: Workspace;
  member: Member;
};

export async function getAppContext(userId: string): Promise<AppContext | null> {
  const user = await findUserById(userId);
  if (!user) return null;
  const member = await findMemberByUserId(userId);
  if (!member) return null;
  const workspace = await findWorkspaceById(member.workspaceId);
  if (!workspace) return null;
  return { user, workspace, member };
}

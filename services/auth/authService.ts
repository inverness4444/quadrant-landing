import bcrypt from "bcryptjs";
import { createUser, findUserByEmail, findUserById, updateUser } from "@/repositories/userRepository";
import { createWorkspace, findWorkspaceById, updateWorkspace } from "@/repositories/workspaceRepository";
import { createMember, findMemberByUserId } from "@/repositories/memberRepository";
import { seedWorkspaceDemoData } from "@/services/workspaceSeed";
import { getAppContext } from "@/services/appContext";

export async function registerUser({
  email,
  password,
  name,
  companyName,
}: {
  email: string;
  password: string;
  name?: string;
  companyName: string;
}) {
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error("EMAIL_TAKEN");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await createUser({
    email,
    passwordHash,
    name,
  });

  const workspace = await createWorkspace({
    name: companyName,
    ownerUserId: user.id,
  });

  await createMember({
    userId: user.id,
    workspaceId: workspace.id,
    role: "owner",
  });
  await seedWorkspaceDemoData(workspace.id);

  return { userId: user.id, workspaceId: workspace.id };
}

export async function validateUser(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  const member = await findMemberByUserId(user.id);
  if (!member) {
    return null;
  }
  const workspace = await findWorkspaceById(member.workspaceId);
  return workspace ? { user, workspace } : null;
}

export async function getUserWithWorkspace(userId: string) {
  const context = await getAppContext(userId);
  if (!context) return null;
  return { user: context.user, workspace: context.workspace };
}

export async function updateWorkspaceSettings(workspaceId: string, data: { name?: string; size?: string | null }) {
  return updateWorkspace(workspaceId, data);
}

export async function updateUserProfile(userId: string, data: { name?: string }) {
  return updateUser(userId, data);
}

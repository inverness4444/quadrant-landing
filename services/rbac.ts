import { Member, MemberRole } from "@/drizzle/schema";
import { countOwners, findMember } from "@/repositories/memberRepository";

export function isOwner(member: Member | null | undefined) {
  return member?.role === "owner";
}

export function isAdmin(member: Member | null | undefined) {
  return member?.role === "admin";
}

export function isMember(member: Member | null | undefined) {
  return member?.role === "member";
}

export function hasRole(member: Member | null | undefined, roles: MemberRole[]) {
  if (!member) return false;
  return roles.includes(member.role);
}

export async function requireMember(workspaceId: string, userId: string) {
  const member = await findMember(workspaceId, userId);
  if (!member) {
    throw new Error("NOT_A_MEMBER");
  }
  return member;
}

export async function requireRole(workspaceId: string, userId: string, roles: MemberRole[]) {
  const member = await findMember(workspaceId, userId);
  if (!member || !roles.includes(member.role)) {
    throw new Error("ACCESS_DENIED");
  }
  return member;
}

export async function ensureOwnerChangeAllowed(workspaceId: string, targetRole: MemberRole) {
  if (targetRole === "owner") {
    return;
  }
  const owners = await countOwners(workspaceId);
  if (owners < 2) {
    throw new Error("CANNOT_REMOVE_LAST_OWNER");
  }
}

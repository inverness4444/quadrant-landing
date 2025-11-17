import { Invite, User, Workspace } from "@/drizzle/schema";
import { createMember, findMember } from "@/repositories/memberRepository";
import { findInviteByToken, markAccepted, markExpired } from "@/repositories/inviteRepository";
import { findWorkspaceById } from "@/repositories/workspaceRepository";
import { canAddMember } from "@/services/planLimits";
import { trackError, trackEvent } from "@/services/monitoring";

const isExpired = (invite: Invite) => new Date(invite.expiresAt).getTime() < Date.now();

export type InviteDetails = {
  invite: Invite;
  workspace: Workspace;
};

export type InviteAcceptanceResult =
  | { status: "accepted"; workspaceId: string }
  | { status: "email_mismatch" }
  | { status: "expired" }
  | { status: "invalid" }
  | { status: "limit_reached"; reason: string };

export async function getInviteDetails(token: string): Promise<InviteDetails | null> {
  const invite = await findInviteByToken(token);
  if (!invite) return null;
  const workspace = await findWorkspaceById(invite.workspaceId);
  if (!workspace) return null;
  if (invite.status === "pending" && isExpired(invite)) {
    await markExpired(invite.id);
    trackError(new Error("INVITE_EXPIRED"), { inviteId: invite.id });
    return { invite: { ...invite, status: "expired" }, workspace };
  }
  return { invite, workspace };
}

export async function acceptInviteForUser(invite: Invite, user: User): Promise<InviteAcceptanceResult> {
  if (invite.status !== "pending") {
    trackError(new Error("INVITE_NOT_PENDING"), { inviteId: invite.id, status: invite.status });
    return { status: "invalid" };
  }
  if (isExpired(invite)) {
    await markExpired(invite.id);
    trackError(new Error("INVITE_EXPIRED"), { inviteId: invite.id });
    return { status: "expired" };
  }
  if (user.email.toLowerCase() !== invite.email) {
    trackError(new Error("INVITE_EMAIL_MISMATCH"), { inviteId: invite.id, inviteEmail: invite.email, userEmail: user.email });
    return { status: "email_mismatch" };
  }
  const limitCheck = await canAddMember(invite.workspaceId);
  if (!limitCheck.allowed) {
    return { status: "limit_reached", reason: limitCheck.reason ?? "Лимит участников достигнут" };
  }
  const existing = await findMember(invite.workspaceId, user.id);
  if (!existing) {
    await createMember({
      userId: user.id,
      workspaceId: invite.workspaceId,
      role: invite.role,
    });
  }
  await markAccepted(invite.id);
  trackEvent("invite_accepted", { inviteId: invite.id, workspaceId: invite.workspaceId, userId: user.id });
  return { status: "accepted", workspaceId: invite.workspaceId };
}

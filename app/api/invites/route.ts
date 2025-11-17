import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/services/rbac";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { createInvite, listInvitesByWorkspace } from "@/repositories/inviteRepository";
import { sendInviteEmail } from "@/services/inviteEmail";
import { canAddMember } from "@/services/planLimits";
import { rateLimitRequest } from "@/services/rateLimit";
import {
  authRequiredError,
  createApiError,
  forbiddenError,
  internalError,
  planLimitError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";
import { trackEvent, trackError } from "@/services/monitoring";
import { z } from "zod";

const payloadSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
});

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const invites = await listInvitesByWorkspace(context.workspace.id);
  return NextResponse.json({ ok: true, invites });
}

export async function POST(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const json = await request.json();
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }

  const limiter = rateLimitRequest(request, "invites:create", 10, 60_000);
  if (!limiter.allowed) {
    return respondWithApiError(
      createApiError(429, "RATE_LIMITED", "Превышен лимит на отправку приглашений", {
        retryAfter: limiter.retryAfter,
      }),
    );
  }

  const limitCheck = await canAddMember(context.workspace.id);
  if (!limitCheck.allowed) {
    return respondWithApiError(planLimitError(limitCheck.reason ?? "Достигнут лимит участников"));
  }

  try {
    const invite = await createInvite({
      workspaceId: context.workspace.id,
      email: parsed.data.email,
      role: parsed.data.role,
    });
    await sendInviteEmail({
      email: invite.email,
      workspaceName: context.workspace.name,
      token: invite.token,
    });
    trackEvent("invite_sent", { inviteId: invite.id, workspaceId: context.workspace.id });
    return NextResponse.json({ ok: true, invite });
  } catch (error) {
    trackError(error, { route: "invites:create" });
    return respondWithApiError(await internalError(error, { route: "invites:create" }));
  }
}

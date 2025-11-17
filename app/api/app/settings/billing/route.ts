import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { requireRole } from "@/services/rbac";
import { getWorkspacePlan, getWorkspaceUsage } from "@/services/planLimits";
import { listAllPlans } from "@/repositories/planRepository";
import { updateWorkspace } from "@/repositories/workspaceRepository";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";

const billingSchema = z.object({
  billingEmail: z.string().email(),
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
  const [{ workspace, plan }, usage, availablePlans] = await Promise.all([
    getWorkspacePlan(context.workspace.id),
    getWorkspaceUsage(context.workspace.id),
    listAllPlans(),
  ]);
  return NextResponse.json({
    ok: true,
    plan,
    workspace: {
      billingEmail: workspace.billingEmail,
      trialEndsAt: workspace.trialEndsAt,
    },
    usage,
    plans: availablePlans,
  });
}

export async function PUT(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const json = await request.json().catch(() => null);
  const parsed = billingSchema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    await updateWorkspace(context.workspace.id, { billingEmail: parsed.data.billingEmail });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "settings/billing" }));
  }
}

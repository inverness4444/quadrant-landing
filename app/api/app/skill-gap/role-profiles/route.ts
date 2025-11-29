import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { requireMember, requireRole } from "@/services/rbac";
import { getRoleProfilesForWorkspace, upsertRoleProfile } from "@/services/skillGapService";

const requirementSchema = z.object({
  skillCode: z.string(),
  levelRequired: z.number().int().min(1).max(5),
  weight: z.number().optional(),
});

const roleProfileSchema = z.object({
  roleId: z.string().optional(),
  name: z.string().min(2),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  requirements: z.array(requirementSchema).optional().default([]),
});

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireMember(context.workspace.id, context.user.id);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  try {
    const profiles = await getRoleProfilesForWorkspace(context.workspace.id);
    return NextResponse.json({ ok: true, profiles });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "skill-gap:role-profiles:get" }));
  }
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
  const body = await request.json().catch(() => null);
  const parsed = roleProfileSchema.safeParse(body);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const profile = await upsertRoleProfile({
      workspaceId: context.workspace.id,
      roleId: parsed.data.roleId,
      name: parsed.data.name,
      description: parsed.data.description,
      isDefault: parsed.data.isDefault,
      requirements: parsed.data.requirements ?? [],
    });
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "skill-gap:role-profiles:post" }));
  }
}

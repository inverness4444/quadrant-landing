import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { respondWithApiError, authRequiredError, forbiddenError, validationError, internalError } from "@/services/apiError";
import { requireRole } from "@/services/rbac";
import { listSkillRoleProfiles, upsertSkillRoleProfile } from "@/services/skillRoleProfileService";

const itemSchema = z.object({
  skillId: z.string(),
  targetLevel: z.number(),
  weight: z.number().min(1).default(1),
});

const upsertSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  roleCode: z.string().optional().nullable(),
  items: z.array(itemSchema).default([]),
});

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    const profiles = await listSkillRoleProfiles(context.workspace.id);
    return NextResponse.json({ ok: true, profiles });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "skills:profiles:list" }));
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
  const json = await request.json().catch(() => null);
  const parsed = upsertSchema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const profile = await upsertSkillRoleProfile({
      workspaceId: context.workspace.id,
      ...parsed.data,
    });
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "skills:profiles:upsert" }));
  }
}

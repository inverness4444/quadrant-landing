import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError } from "@/services/apiError";
import { computeTopGapsForRole } from "@/services/skillGapService";
import { requireRole } from "@/services/rbac";
import { db } from "@/lib/db";
import { roleProfiles } from "@/drizzle/schema";

const paramsSchema = z.object({ roleId: z.string().min(1) });

export async function GET(request: NextRequest, { params }: { params: { roleId: string } }) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  try {
    const { roleId } = paramsSchema.parse(params);
    const roleRow = await db
      .select({ id: roleProfiles.id, workspaceId: roleProfiles.workspaceId })
      .from(roleProfiles)
      .where(eq(roleProfiles.id, roleId));
    if (!roleRow[0] || roleRow[0].workspaceId !== context.workspace.id) {
      return respondWithApiError(forbiddenError());
    }
    const top = await computeTopGapsForRole({ workspaceId: context.workspace.id, roleId, limit: 5 });
    return NextResponse.json({ ok: true, top });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "skills-gap:role-top" }));
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError } from "@/services/apiError";
import { computeSkillProfileForEmployee } from "@/services/skillGapService";
import { requireRole } from "@/services/rbac";
import { db } from "@/lib/db";
import { employees } from "@/drizzle/schema";

const paramsSchema = z.object({ employeeId: z.string().min(1) });

export async function GET(request: NextRequest, { params }: { params: { employeeId: string } }) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  try {
    const { employeeId } = paramsSchema.parse(params);
    const employeeRow = await db
      .select({ id: employees.id, workspaceId: employees.workspaceId })
      .from(employees)
      .where(eq(employees.id, employeeId));
    if (!employeeRow[0] || employeeRow[0].workspaceId !== context.workspace.id) {
      return respondWithApiError(forbiddenError());
    }
    const profile = await computeSkillProfileForEmployee({ workspaceId: context.workspace.id, employeeId });
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "skills-gap:employee" }));
  }
}

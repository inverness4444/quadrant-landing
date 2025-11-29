import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { db } from "@/lib/db";
import { employees, questAssignments } from "@/drizzle/schema";
import { updateQuestStepProgress } from "@/services/questService";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  notFoundError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";
import { z } from "zod";

const schema = z.object({
  questAssignmentId: z.string(),
  stepId: z.string(),
  status: z.enum(["not_started", "in_progress", "done"]),
  notes: z.string().optional().nullable(),
});

export async function PATCH(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const assignment = await db.query.questAssignments.findFirst({
      where: eq(questAssignments.id, parsed.data.questAssignmentId),
    });
    if (!assignment) {
      return respondWithApiError(notFoundError("Назначение квеста не найдено"));
    }
    let canEdit = false;
    try {
      await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
      canEdit = true;
    } catch {
      const employee = await resolveEmployeeForUser(context.workspace.id, context.user.name);
      if (employee && (employee.id === assignment.employeeId || employee.id === assignment.mentorEmployeeId)) {
        canEdit = true;
      }
    }
    if (!canEdit) {
      return respondWithApiError(forbiddenError());
    }
    const result = await updateQuestStepProgress(parsed.data);
    if (!result) {
      return respondWithApiError(notFoundError("Шаг не найден"));
    }
    return NextResponse.json({ ok: true, progress: result });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "quests:step:progress" }));
  }
}

async function resolveEmployeeForUser(workspaceId: string, userName: string | null) {
  if (userName) {
    const found = await db.query.employees.findFirst({
      where: and(eq(employees.workspaceId, workspaceId), eq(employees.name, userName)),
    });
    if (found) return found;
  }
  return db.query.employees.findFirst({ where: eq(employees.workspaceId, workspaceId) });
}

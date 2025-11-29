import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { assignQuestToEmployees, getAssignmentsForQuest } from "@/services/questService";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  notFoundError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";
import { getQuestById } from "@/services/questService";

type RouteParams = { params: { id: string } };

const assignSchema = z.object({
  employeeIds: z.array(z.string()).min(1),
  mentorEmployeeId: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  try {
    const quest = await getQuestById(params.id, context.workspace.id);
    if (!quest) {
      return respondWithApiError(notFoundError("Квест не найден"));
    }
    const assignments = await getAssignmentsForQuest(params.id, context.workspace.id);
    return NextResponse.json({ ok: true, assignments });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "quests:assignments:list", questId: params.id }));
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
  const parsed = assignSchema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const quest = await getQuestById(params.id, context.workspace.id);
    if (!quest) {
      return respondWithApiError(notFoundError("Квест не найден"));
    }
    const assignments = await assignQuestToEmployees({
      questId: params.id,
      employeeIds: parsed.data.employeeIds,
      mentorEmployeeId: parsed.data.mentorEmployeeId,
    });
    return NextResponse.json({ ok: true, assignments });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "quests:assignments:create", questId: params.id }));
  }
}

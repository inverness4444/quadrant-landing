import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { removeEmployee, updateEmployee } from "@/repositories/employeeRepository";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  notFoundError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";

const payloadSchema = z.object({
  name: z.string().min(2),
  position: z.string().min(2),
  level: z.enum(["Junior", "Middle", "Senior"]),
  primaryTrackId: z.string().optional().nullable(),
  trackLevelId: z.string().optional().nullable(),
  skills: z
    .array(
      z.object({
        skillId: z.string(),
        level: z.number().min(1).max(5),
      }),
    )
    .optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
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
  try {
    const employee = await updateEmployee(context.workspace.id, id, parsed.data);
    return NextResponse.json({ ok: true, employee });
  } catch (error) {
    if ((error as Error).message === "EMPLOYEE_NOT_FOUND") {
      return respondWithApiError(notFoundError("Сотрудник не найден"));
    }
    return respondWithApiError(await internalError(error, { route: "employees:update" }));
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
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
    await removeEmployee(context.workspace.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if ((error as Error).message === "EMPLOYEE_NOT_FOUND") {
      return respondWithApiError(notFoundError("Сотрудник не найден"));
    }
    return respondWithApiError(await internalError(error, { route: "employees:delete" }));
  }
}

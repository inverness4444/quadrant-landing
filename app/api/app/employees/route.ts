import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { createEmployee } from "@/repositories/employeeRepository";
import { canAddEmployee } from "@/services/planLimits";
import { getEmployeePage } from "@/services/employeeData";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  planLimitError,
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
  try {
    const check = await canAddEmployee(context.workspace.id);
    if (!check.allowed) {
      return respondWithApiError(planLimitError(check.reason ?? "Достигнут лимит сотрудников"));
    }
    const employee = await createEmployee(context.workspace.id, parsed.data);
    return NextResponse.json({ ok: true, employee });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "employees:create" }));
  }
}

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  const params = request.nextUrl.searchParams;
  const page = Number(params.get("page") ?? "1");
  const pageSize = Number(params.get("pageSize") ?? "20");
  if (Number.isNaN(page) || Number.isNaN(pageSize)) {
    return respondWithApiError(validationError({ page: ["Некорректные параметры пагинации"] }));
  }
  const levelParam = params.get("level");
  const positionParam = params.get("position");
  const filters = {
    page: Math.max(1, page),
    pageSize: Math.min(100, Math.max(1, pageSize)),
    search: params.get("search") ?? undefined,
    level:
      levelParam && levelParam !== "all"
        ? (levelParam as "Junior" | "Middle" | "Senior")
        : ("all" as const),
    position: positionParam && positionParam !== "all" ? positionParam : undefined,
  };
  const result = await getEmployeePage(context.workspace.id, filters);
  return NextResponse.json({ ok: true, ...result });
}

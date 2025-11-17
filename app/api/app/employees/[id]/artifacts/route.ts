import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { getEmployeeById } from "@/repositories/employeeRepository";
import { getEmployeeArtifactsPage } from "@/services/employeeData";
import { authRequiredError, notFoundError, respondWithApiError, validationError } from "@/services/apiError";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }

  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = Number(request.nextUrl.searchParams.get("pageSize") ?? "5");
  if (Number.isNaN(page) || Number.isNaN(pageSize)) {
    return respondWithApiError(validationError({ page: ["Некорректные параметры пагинации"] }));
  }

  const employee = await getEmployeeById(id);
  if (!employee || employee.workspaceId !== context.workspace.id) {
    return respondWithApiError(notFoundError("Сотрудник не найден"));
  }

  const result = await getEmployeeArtifactsPage(context.workspace.id, employee.id, page, pageSize);
  return NextResponse.json({ ok: true, ...result });
}

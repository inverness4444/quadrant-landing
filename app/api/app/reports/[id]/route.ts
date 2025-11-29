import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { getReportById, updateReportMeta } from "@/services/reportService";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  notFoundError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";

type RouteParams = { params: { id: string } };

const patchSchema = z.object({
  title: z.string().optional(),
  status: z.enum(["draft", "finalized", "archived"]).optional(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  try {
    const report = await getReportById(params.id, context.workspace.id);
    if (!report) {
      return respondWithApiError(notFoundError("Отчёт не найден"));
    }
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "reports:get", reportId: params.id }));
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const report = await updateReportMeta({
      reportId: params.id,
      workspaceId: context.workspace.id,
      title: parsed.data.title,
      status: parsed.data.status,
    });
    if (!report) {
      return respondWithApiError(notFoundError("Отчёт не найден"));
    }
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "reports:update", reportId: params.id }));
  }
}

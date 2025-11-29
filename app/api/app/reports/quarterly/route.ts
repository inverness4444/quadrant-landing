import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { requireRole } from "@/services/rbac";
import {
  createOrUpdateQuarterlyReport,
  getOrCreateQuarterlyReport,
  getQuarterlyReportById,
  getQuarterlyReportWithMetrics,
  parseQuarterlyReportPayload,
  updateQuarterlyReportMetadata,
} from "@/services/quarterlyReportService";

const querySchema = z.object({
  year: z.coerce.number().int().optional(),
  quarter: z.coerce.number().int().min(1).max(4).optional(),
});

const updateSchema = z.object({
  reportId: z.string(),
  title: z.string().optional(),
  notes: z.string().optional().nullable(),
  isLocked: z.boolean().optional(),
});

const generateSchema = z.object({
  year: z.coerce.number().int(),
  quarter: z.coerce.number().int().min(1).max(4),
  title: z.string().optional(),
  notes: z.string().optional().nullable(),
  lock: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const report = await getOrCreateQuarterlyReport({
      workspaceId: context.workspace.id,
      year: parsed.data.year,
      quarter: parsed.data.quarter as 1 | 2 | 3 | 4 | undefined,
    });
    const byId = report.id
      ? await getQuarterlyReportById({ workspaceId: context.workspace.id, reportId: report.id })
      : null;
    const payload = byId?.payload ?? parseQuarterlyReportPayload(report.payload);
    const finalPayload =
      payload ??
      (await createOrUpdateQuarterlyReport({
        workspaceId: context.workspace.id,
        year: report.period.year,
        quarter: report.period.quarter as 1 | 2 | 3 | 4,
        userId: context.user.id,
      })).payload;
    const { meta, summary } = await getQuarterlyReportWithMetrics({
      workspaceId: context.workspace.id,
      userId: context.user.id,
      year: report.period.year,
      quarter: report.period.quarter as 1 | 2 | 3 | 4,
    });
    return NextResponse.json({ ok: true, report: meta ?? report, payload: finalPayload, summary });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "quarterly:get" }));
  }
}

export async function PATCH(request: NextRequest) {
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
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const updated = await updateQuarterlyReportMetadata({
      workspaceId: context.workspace.id,
      ...parsed.data,
    });
    if (!updated) {
      return respondWithApiError(validationError({ reportId: ["Отчёт не найден"] }));
    }
    return NextResponse.json({ ok: true, report: updated });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "quarterly:update" }));
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
  const parsed = generateSchema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const result = await createOrUpdateQuarterlyReport({
      workspaceId: context.workspace.id,
      year: parsed.data.year,
      quarter: parsed.data.quarter as 1 | 2 | 3 | 4,
      title: parsed.data.title,
      notes: parsed.data.notes ?? null,
      lock: parsed.data.lock,
      userId: context.user.id,
    });
    return NextResponse.json({ ok: true, report: result.report, payload: result.payload });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "quarterly:generate" }));
  }
}

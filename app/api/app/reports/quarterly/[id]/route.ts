import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, internalError, respondWithApiError } from "@/services/apiError";
import { getQuarterlyReportById } from "@/services/quarterlyReportService";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    const result = await getQuarterlyReportById({ workspaceId: context.workspace.id, reportId: params.id });
    if (!result) {
      return NextResponse.json({ ok: false, error: { message: "Отчёт не найден" } }, { status: 404 });
    }
    return NextResponse.json({ ok: true, report: result.report, payload: result.payload });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "quarterly:get-by-id", meta: { id: params.id } }));
  }
}

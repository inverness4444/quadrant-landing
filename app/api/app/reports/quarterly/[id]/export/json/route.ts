import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, internalError, respondWithApiError } from "@/services/apiError";
import { getQuarterlyReportById } from "@/services/quarterlyReportService";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    const result = await getQuarterlyReportById({ workspaceId: context.workspace.id, reportId: params.id });
    if (!result?.payload) {
      return NextResponse.json({ ok: false, error: { message: "Payload not found" } }, { status: 404 });
    }
    return NextResponse.json(result.payload);
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "quarterly:export-json", meta: { id: params.id } }));
  }
}

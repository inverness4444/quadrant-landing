import { addDays, startOfDay } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, internalError, respondWithApiError } from "@/services/apiError";
import { buildAgendaForManager } from "@/services/agendaService";

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    const params = request.nextUrl.searchParams;
    const fromParam = parseDate(params.get("from"));
    const toParam = parseDate(params.get("to"));
    const start = fromParam ? startOfDay(fromParam) : startOfDay(new Date());
    const end = toParam ? startOfDay(toParam) : startOfDay(addDays(new Date(), 14));
    const items = await buildAgendaForManager({
      workspaceId: context.workspace.id,
      managerId: context.user.id,
      fromDate: start.toISOString(),
      toDate: end.toISOString(),
    });
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "agenda:list" }));
  }
}

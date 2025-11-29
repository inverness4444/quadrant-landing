import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { scheduleOneOnOne, listUpcomingForManager } from "@/services/oneOnOneService";

const createSchema = z.object({
  employeeId: z.string(),
  scheduledAt: z.string(),
  durationMinutes: z.number().int().min(15).max(240).optional(),
});

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  const params = request.nextUrl.searchParams;
  const from = params.get("from") ?? new Date().toISOString();
  const to = params.get("to") ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const items = await listUpcomingForManager({ workspaceId: context.workspace.id, managerId: context.user.id, fromDate: from, toDate: to });
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "one-on-ones:list" }));
  }
}

export async function POST(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  try {
    const one = await scheduleOneOnOne({
      workspaceId: context.workspace.id,
      managerId: context.user.id,
      employeeId: parsed.data.employeeId,
      scheduledAt: parsed.data.scheduledAt,
      durationMinutes: parsed.data.durationMinutes,
    });
    return NextResponse.json({ ok: true, oneOnOne: one });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "one-on-ones:create" }));
  }
}

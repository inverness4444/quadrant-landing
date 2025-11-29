import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { requireMember, requireRole } from "@/services/rbac";
import { createOrUpdatePilot, listPilots } from "@/services/pilotProgramService";

const pilotSchema = z.object({
  pilotId: z.string().optional(),
  name: z.string().min(2),
  description: z.string().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  targetAudience: z.string().optional().nullable(),
  successCriteria: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["draft", "planned", "active", "completed", "cancelled", "archived"]).optional(),
});

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireMember(context.workspace.id, context.user.id);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const params = request.nextUrl.searchParams;
  const status = params.get("status") ?? undefined;
  const limit = params.get("limit");
  const offset = params.get("offset");
  try {
    const result = await listPilots({
      workspaceId: context.workspace.id,
      status: status ?? "all",
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    return NextResponse.json({ ok: true, items: result.items, total: result.total });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "pilots:list" }));
  }
}

export async function POST(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const body = await request.json().catch(() => null);
  const parsed = pilotSchema.safeParse(body);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  const start = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
  const end = parsed.data.endDate ? new Date(parsed.data.endDate) : null;
  if (start && end && end.getTime() < start.getTime()) {
    return respondWithApiError(validationError({ endDate: ["Дата окончания раньше начала"] }));
  }
  try {
    const pilot = await createOrUpdatePilot({
      workspaceId: context.workspace.id,
      ownerId: context.user.id,
      ...parsed.data,
    });
    return NextResponse.json({ ok: true, pilot });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "pilots:create" }));
  }
}

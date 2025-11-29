import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { getOneOnOneById, updateOneOnOne } from "@/services/oneOnOneService";

const updateSchema = z.object({
  scheduledAt: z.string().optional(),
  durationMinutes: z.number().int().min(15).max(240).optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    const data = await getOneOnOneById({ workspaceId: context.workspace.id, oneOnOneId: params.id, managerId: context.user.id });
    if (!data) return NextResponse.json({ ok: false, error: { message: "Не найдено" } }, { status: 404 });
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "one-on-ones:get" }));
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  try {
    const updated = await updateOneOnOne({
      workspaceId: context.workspace.id,
      oneOnOneId: params.id,
      managerId: context.user.id,
      ...parsed.data,
    });
    if (!updated) return NextResponse.json({ ok: false, error: { message: "Не найдено" } }, { status: 404 });
    return NextResponse.json({ ok: true, oneOnOne: updated });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "one-on-ones:update" }));
  }
}

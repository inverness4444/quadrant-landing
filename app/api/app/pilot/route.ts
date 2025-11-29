import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { requireMember } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";
import { createPilotWithDefaultSteps, getCurrentPilot } from "@/services/pilotService";
import { findActivePilot } from "@/repositories/pilotRepository";

const createPilotSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  goals: z.string().min(5).max(2000).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireMember(context.workspace.id, context.user.id);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  try {
    const pilot = await getCurrentPilot(context.workspace.id);
    return NextResponse.json({ ok: true, pilot });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "pilot:get" }));
  }
}

export async function POST(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireMember(context.workspace.id, context.user.id);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const json = await request.json().catch(() => null);
  const parsed = createPilotSchema.safeParse(json ?? {});
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const activePilot = await findActivePilot(context.workspace.id);
    if (activePilot) {
      return respondWithApiError(
        validationError({
          name: ["У вас уже есть активный пилот. Завершите его или переведите в архив, чтобы создать новый."],
        }),
      );
    }
    const now = new Date();
    const defaultStart = parsed.data.startDate ?? now.toISOString();
    const defaultEnd =
      parsed.data.endDate ?? new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000).toISOString();
    const summary = await createPilotWithDefaultSteps(context.workspace.id, {
      name: parsed.data.name ?? `Пилот Quadrant — ${now.getFullYear()}`,
      status: "active",
      startDate: defaultStart,
      endDate: defaultEnd,
      goals:
        parsed.data.goals ??
        "Оценить карту навыков, риски и подбор команды, чтобы принять решение о масштабировании Quadrant.",
    });
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "pilot:create" }));
  }
}

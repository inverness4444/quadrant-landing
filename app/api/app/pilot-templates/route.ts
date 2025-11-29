import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { requireRole } from "@/services/rbac";
import { createCustomPilotTemplate, listPilotTemplates } from "@/services/pilotTemplateService";

const listSchema = z.object({
  includeGlobal: z.coerce.boolean().optional().default(true),
  includeArchived: z.coerce.boolean().optional().default(false),
});

const createSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  targetRole: z.string().optional(),
  targetSkillId: z.string().optional(),
  suggestedDurationWeeks: z.number().int().optional(),
  intensityLevel: z.string().optional(),
  steps: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        expectedOutcome: z.string().optional(),
        suggestedDueOffsetWeeks: z.number().int().optional(),
        isRequired: z.boolean().optional(),
      }),
    )
    .min(1),
});

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  const parsed = listSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsed.success) return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  try {
    const templates = await listPilotTemplates({
      workspaceId: context.workspace.id,
      includeGlobal: parsed.data.includeGlobal,
      includeArchived: parsed.data.includeArchived,
    });
    return NextResponse.json({ ok: true, templates });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "pilot-templates:get" }));
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
  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  try {
    const template = await createCustomPilotTemplate({
      workspaceId: context.workspace.id,
      userId: context.user.id,
      data: parsed.data,
    });
    return NextResponse.json({ ok: true, template });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "pilot-templates:create" }));
  }
}

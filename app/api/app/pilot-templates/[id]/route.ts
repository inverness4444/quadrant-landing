import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { requireRole } from "@/services/rbac";
import { archivePilotTemplate, getPilotTemplateWithSteps } from "@/services/pilotTemplateService";

const paramsSchema = z.object({ id: z.string() });

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) return respondWithApiError(validationError(parsedParams.error.flatten().fieldErrors));
  try {
    const tpl = await getPilotTemplateWithSteps({ workspaceId: context.workspace.id, templateId: parsedParams.data.id });
    if (!tpl) return respondWithApiError(validationError({ id: ["Шаблон не найден"] }));
    return NextResponse.json({ ok: true, template: tpl.template, steps: tpl.steps });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "pilot-templates:getOne" }));
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) return respondWithApiError(validationError(parsedParams.error.flatten().fieldErrors));
  try {
    await archivePilotTemplate({ workspaceId: context.workspace.id, templateId: parsedParams.data.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "pilot-templates:archive" }));
  }
}

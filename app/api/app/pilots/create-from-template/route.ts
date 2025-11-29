import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { createPilotFromTemplate } from "@/services/pilotWizardService";

const bodySchema = z.object({
  employeeId: z.string(),
  templateId: z.string(),
  startDate: z.string().transform((v) => new Date(v)),
  customTitle: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  try {
    const result = await createPilotFromTemplate({
      workspaceId: context.workspace.id,
      userId: context.user.id,
      ...parsed.data,
    });
    return NextResponse.json({ ok: true, pilotId: result.pilotId });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "pilot-create-from-template" }));
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, respondWithApiError, validationError, internalError } from "@/services/apiError";
import { buildPilotPreviewFromTemplate } from "@/services/pilotWizardService";

const bodySchema = z.object({
  employeeId: z.string(),
  templateId: z.string(),
  startDate: z.string().transform((v) => new Date(v)),
});

export async function POST(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  try {
    const preview = await buildPilotPreviewFromTemplate({
      workspaceId: context.workspace.id,
      ...parsed.data,
    });
    return NextResponse.json({ ok: true, preview });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "pilot-preview" }));
  }
}

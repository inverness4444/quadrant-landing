import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { addNote } from "@/services/oneOnOneService";

const noteSchema = z.object({
  text: z.string().min(1),
  visibility: z.enum(["private", "shared_with_employee"]).optional(),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  const body = await request.json().catch(() => null);
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  try {
    const note = await addNote({
      workspaceId: context.workspace.id,
      oneOnOneId: params.id,
      authorId: context.user.id,
      visibility: parsed.data.visibility,
      text: parsed.data.text,
    });
    return NextResponse.json({ ok: true, note });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "one-on-ones:add-note" }));
  }
}

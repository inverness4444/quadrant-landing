import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { registerUser } from "@/services/auth/authService";
import { setSession } from "@/lib/session";
import { rateLimitRequest } from "@/services/rateLimit";
import {
  createApiError,
  internalError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";
import { trackEvent } from "@/services/monitoring";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  companyName: z.string().min(2).optional(),
  inviteToken: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const json = await request.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }

  const limit = rateLimitRequest(request, "auth:register", 5, 60_000);
  if (!limit.allowed) {
    return respondWithApiError(
      createApiError(429, "RATE_LIMITED", "Слишком много регистраций, попробуйте позже", {
        retryAfter: limit.retryAfter,
      }),
    );
  }

  if (!parsed.data.inviteToken && !parsed.data.companyName) {
    return respondWithApiError(validationError({ companyName: ["Укажите компанию"] }));
  }

  try {
    const { userId, workspaceId } = await registerUser(parsed.data);
    await setSession(userId);
    if (workspaceId) {
      trackEvent("workspace_created", { workspaceId, ownerId: userId });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if ((error as Error).message === "EMAIL_TAKEN") {
      return respondWithApiError(createApiError(409, "VALIDATION_ERROR", "Email уже занят"));
    }
    return respondWithApiError(await internalError(error, { route: "auth/register" }));
  }
}

import { NextRequest, NextResponse } from "next/server";
import { validateUser } from "@/services/auth/authService";
import { setSession } from "@/lib/session";
import { rateLimitRequest } from "@/services/rateLimit";
import {
  authRequiredError,
  createApiError,
  internalError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";
import { trackError } from "@/services/monitoring";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  const json = await request.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }

  const limit = rateLimitRequest(request, "auth:login", 10, 60_000);
  if (!limit.allowed) {
    return respondWithApiError(
      createApiError(429, "RATE_LIMITED", "Слишком много попыток входа, попробуйте позже", {
        retryAfter: limit.retryAfter,
      }),
    );
  }

  try {
    const result = await validateUser(parsed.data.email, parsed.data.password);
    if (!result) {
      trackError(new Error("LOGIN_FAILED"), { email: parsed.data.email });
      return respondWithApiError(authRequiredError());
    }

    await setSession(result.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "auth/login" }));
  }
}

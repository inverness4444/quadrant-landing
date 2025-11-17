import { NextResponse } from "next/server";
import { trackError } from "@/services/monitoring";

export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "PLAN_LIMIT_REACHED"
  | "RATE_LIMITED"
  | "CSRF_TOKEN_INVALID"
  | "INTERNAL_ERROR";

export type ApiError = {
  status: number;
  body: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};

export function createApiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): ApiError {
  return {
    status,
    body: details ? { code, message, details } : { code, message },
  };
}

export function respondWithApiError(error: ApiError) {
  return NextResponse.json({ ok: false, error: error.body }, { status: error.status });
}

export function validationError(details?: unknown) {
  return createApiError(400, "VALIDATION_ERROR", "Проверьте правильность данных", details);
}

export function authRequiredError() {
  return createApiError(401, "AUTH_REQUIRED", "Требуется авторизация");
}

export function forbiddenError(message = "Недостаточно прав") {
  return createApiError(403, "FORBIDDEN", message);
}

export function notFoundError(message = "Ресурс не найден") {
  return createApiError(404, "NOT_FOUND", message);
}

export function planLimitError(reason: string) {
  return createApiError(403, "PLAN_LIMIT_REACHED", reason);
}

export function rateLimitedError(retryAfter?: number) {
  const details = typeof retryAfter === "number" ? { retryAfter } : undefined;
  return createApiError(429, "RATE_LIMITED", "Слишком много запросов, попробуйте позже", details);
}

export function csrfError() {
  return createApiError(403, "CSRF_TOKEN_INVALID", "Не удалось подтвердить запрос");
}

export async function internalError(error: unknown, context?: Record<string, unknown>): Promise<ApiError> {
  trackError(error, context);
  return createApiError(500, "INTERNAL_ERROR", "Произошла непредвиденная ошибка");
}

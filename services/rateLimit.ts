import { NextRequest } from "next/server";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
  key: string;
};

const buckets = new Map<string, { count: number; expiresAt: number }>();

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0, key };
  }
  if (existing.count < limit) {
    existing.count += 1;
    buckets.set(key, existing);
    return { allowed: true, remaining: limit - existing.count, retryAfter: existing.expiresAt - now, key };
  }
  return { allowed: false, remaining: 0, retryAfter: existing.expiresAt - now, key };
}

function resolveRequestIdentity(request: NextRequest) {
  const clientIp = (request as NextRequest & { ip?: string }).ip;
  return (
    clientIp ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export function rateLimitRequest(request: NextRequest, action: string, limit: number, windowMs: number) {
  const identity = resolveRequestIdentity(request);
  return checkRateLimit({
    key: `${action}:${identity}`,
    limit,
    windowMs,
  });
}

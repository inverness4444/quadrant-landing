import { NextRequest, NextResponse } from "next/server";
import { env } from "@/config/env";
import { CSRF_COOKIE, SESSION_COOKIE } from "@/lib/session";

const BASIC_AUTH_PATH = "/admin";
const CSRF_HEADER = "x-quadrant-csrf";
const PROTECTED_API_PREFIXES = ["/api/app", "/api/invites"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(BASIC_AUTH_PATH)) {
    const response = enforceBasicAuth(request);
    if (response) {
      return applySecurityHeaders(response);
    }
  }

  if (requiresCsrfProtection(request)) {
    const tokenFromHeader = request.headers.get(CSRF_HEADER);
    const tokenFromCookie = request.cookies.get(CSRF_COOKIE)?.value;
    if (!tokenFromHeader || !tokenFromCookie || tokenFromHeader !== tokenFromCookie) {
      return applySecurityHeaders(
        new NextResponse(
          JSON.stringify({ ok: false, error: { code: "CSRF_TOKEN_INVALID", message: "Не удалось подтвердить запрос" } }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    }
  }

  if (pathname.startsWith("/app")) {
    const hasSession = request.cookies.get(SESSION_COOKIE);
    if (!hasSession) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }
  }

  const response = NextResponse.next();
  maybeSetCsrfCookie(request, response);
  return applySecurityHeaders(response);
}

function enforceBasicAuth(request: NextRequest) {
  const username = env.admin.username;
  const password = env.admin.password;
  const auth = request.headers.get("authorization");
  if (!username || !password || !auth) {
    return new NextResponse("Auth required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Quadrant Admin"' },
    });
  }
  const [scheme, encoded] = auth.split(" ");
  if (scheme !== "Basic") {
    return new NextResponse("Auth required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Quadrant Admin"' },
    });
  }
  const decoded = Buffer.from(encoded, "base64").toString();
  const [user, pass] = decoded.split(":");
  if (user !== username || pass !== password) {
    return new NextResponse("Invalid credentials", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Quadrant Admin"' },
    });
  }
  return null;
}

function requiresCsrfProtection(request: NextRequest) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return false;
  return PROTECTED_API_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix));
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' data: https:",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "font-src 'self' data:",
    ].join("; "),
  );
  if (env.isProduction) {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return response;
}

function maybeSetCsrfCookie(request: NextRequest, response: NextResponse) {
  const hasSession = request.cookies.get(SESSION_COOKIE);
  const hasCsrfCookie = request.cookies.get(CSRF_COOKIE);
  if (hasSession && !hasCsrfCookie) {
    response.cookies.set(CSRF_COOKIE, crypto.randomUUID(), {
      httpOnly: false,
      secure: env.isProduction,
      sameSite: "lax",
      path: "/",
    });
  }
}

export const config = {
  matcher: ["/admin/:path*", "/app/:path*", "/api/:path*"],
};

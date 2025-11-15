import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BASIC_AUTH_PATH = "/admin";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(BASIC_AUTH_PATH)) {
    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;
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
    return NextResponse.next();
  }

  if (pathname.startsWith("/app")) {
    const hasSession = request.cookies.get("quadrant_session");
    if (!hasSession) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/app/:path*"],
};

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/config/env";

export const SESSION_COOKIE = "quadrant_session";
export const CSRF_COOKIE = "quadrant_csrf";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const createCsrfToken = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export async function setSession(userId: string, response?: NextResponse) {
  const csrfToken = createCsrfToken();
  if (response) {
    response.cookies.set(SESSION_COOKIE, userId, {
      httpOnly: true,
      secure: env.isProduction,
      path: "/",
      maxAge: SESSION_MAX_AGE,
      sameSite: "lax",
    });
    response.cookies.set(CSRF_COOKIE, csrfToken, {
      httpOnly: false,
      secure: env.isProduction,
      path: "/",
      maxAge: SESSION_MAX_AGE,
      sameSite: "lax",
    });
    return;
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    secure: env.isProduction,
    path: "/",
    maxAge: SESSION_MAX_AGE,
    sameSite: "lax",
  });
  store.set(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure: env.isProduction,
    path: "/",
    maxAge: SESSION_MAX_AGE,
    sameSite: "lax",
  });
}

export async function clearSession(response?: NextResponse) {
  if (response) {
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: env.isProduction,
      path: "/",
      maxAge: 0,
      sameSite: "lax",
    });
    response.cookies.set(CSRF_COOKIE, "", {
      httpOnly: false,
      secure: env.isProduction,
      path: "/",
      maxAge: 0,
      sameSite: "lax",
    });
    return;
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: env.isProduction,
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  store.set(CSRF_COOKIE, "", {
    httpOnly: false,
    secure: env.isProduction,
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
}

export async function getUserIdFromCookies() {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE);
  return cookie?.value ?? null;
}

export function getUserIdFromRequest(request: NextRequest) {
  return request.cookies.get(SESSION_COOKIE)?.value ?? null;
}

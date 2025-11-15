import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const SESSION_COOKIE = "quadrant_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function setSession(userId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    sameSite: "lax",
  });
}

export async function clearSession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function getUserIdFromCookies() {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE);
  return cookie?.value ?? null;
}

export function getUserIdFromRequest(request: NextRequest) {
  return request.cookies.get(SESSION_COOKIE)?.value ?? null;
}

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/config/env";
import { findUserByEmail } from "@/repositories/userRepository";
import { setSession } from "@/lib/session";
import { trackEvent, trackError } from "@/services/monitoring";

export async function GET(request: NextRequest) {
  if (!env.demo.enabled) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
  const demoEmail = env.demo.email ?? "demo@quadrant.app";
  const user = await findUserByEmail(demoEmail);
  if (!user) {
    trackError(new Error("DEMO_USER_MISSING"));
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
  const response = NextResponse.redirect(new URL("/app", request.url));
  await setSession(user.id, response);
  trackEvent("demo_login", { userId: user.id });
  return response;
}

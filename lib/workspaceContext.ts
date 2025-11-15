import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getUserIdFromCookies, getUserIdFromRequest } from "@/lib/session";
import { getAppContext } from "@/services/appContext";

export async function requireWorkspaceContext() {
  const userId = await getUserIdFromCookies();
  if (!userId) {
    redirect("/auth/login");
  }
  const context = await getAppContext(userId);
  if (!context) {
    redirect("/auth/login");
  }
  return context;
}

export async function getWorkspaceContextFromRequest(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return null;
  const context = await getAppContext(userId);
  if (!context) return null;
  return context;
}

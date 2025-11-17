import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { clearSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  await clearSession();
  let nextUrl: string | null = null;
  try {
    const formData = await request.formData();
    const value = formData.get("next");
    if (typeof value === "string" && value.startsWith("/")) {
      nextUrl = value;
    }
  } catch {
    nextUrl = null;
  }
  redirect(nextUrl ?? "/");
}

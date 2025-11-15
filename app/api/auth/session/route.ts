import { NextResponse } from "next/server";
import { getUserIdFromCookies } from "@/lib/session";
import { getUserWithWorkspace } from "@/services/auth/authService";

export async function GET() {
  const userId = await getUserIdFromCookies();
  if (!userId) {
    return NextResponse.json({ authenticated: false });
  }

  const session = await getUserWithWorkspace(userId);
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
    workspace: {
      id: session.workspace.id,
      name: session.workspace.name,
    },
  });
}

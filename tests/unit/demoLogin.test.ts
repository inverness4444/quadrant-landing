import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { members, users, workspaces } from "@/drizzle/schema";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createMember } from "@/repositories/memberRepository";
import { SESSION_COOKIE } from "@/lib/session";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";

async function resetDb() {
  await db.delete(members).run();
  await db.delete(workspaces).run();
  await db.delete(users).run();
}

describe("demo login route", () => {
  beforeEach(async () => {
    vi.resetModules();
    await resetDb();
    await ensureDefaultTestPlan();
  });

  it("creates a session and redirects when enabled", async () => {
    const email = `demo-${randomUUID()}@example.com`;
    process.env.DEMO_ENABLED = "true";
    process.env.DEMO_EMAIL = email;
    const plan = await ensureDefaultTestPlan();
    const user = await createUser({ email, passwordHash: "hash", name: "Demo" });
    const workspace = await createWorkspace({
      name: "Demo WS",
      ownerUserId: user.id,
      planId: plan?.id ?? null,
    });
    await createMember({ userId: user.id, workspaceId: workspace.id, role: "owner" });
    const { GET } = await import("@/app/auth/demo-login/route");
    const request = new NextRequest(new URL("http://localhost/auth/demo-login"));
    const response = await GET(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/app");
    expect(response.cookies.get(SESSION_COOKIE)?.value).toBe(user.id);
  });

  it("falls back to /auth/login when demo disabled", async () => {
    process.env.DEMO_ENABLED = "false";
    process.env.DEMO_EMAIL = `demo-${randomUUID()}@example.com`;
    const { GET } = await import("@/app/auth/demo-login/route");
    const request = new NextRequest(new URL("http://localhost/auth/demo-login"));
    const response = await GET(request);
    expect(response.headers.get("location")).toBe("http://localhost/auth/login");
  });
});

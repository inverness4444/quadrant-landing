/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE } from "@/lib/session";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createMember } from "@/repositories/memberRepository";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";

describe("onboarding API", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("returns onboarding state for owner", async () => {
    const user = await createUser({ email: `owner-${randomUUID()}@example.com`, passwordHash: "hash" });
    const workspace = await createWorkspace({ name: "Onboarding API", ownerUserId: user.id });
    await createMember({ userId: user.id, workspaceId: workspace.id, role: "owner" });

    const { GET } = await import("@/app/api/app/onboarding/state/route");
    const request = new NextRequest(new URL("http://localhost/api/app/onboarding/state"));
    request.cookies.set(SESSION_COOKIE, user.id);
    const response = await GET(request as any);
    expect(response.status).toBe(200);
    const json = (await response.json()) as any;
    expect(json.ok).toBe(true);
    expect(json.state.workspaceId).toBe(workspace.id);
  });
});

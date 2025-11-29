import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { createMember } from "@/repositories/memberRepository";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import { createOrUpdateQuarterlyReport, generateQuarterlyPayload } from "@/services/quarterlyReportService";
import { SESSION_COOKIE } from "@/lib/session";

describe("quarterlyReport payload", () => {
  let workspaceId: string;
  let userId: string;

  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
    const plan = await ensureDefaultTestPlan();
    const user = await createUser({ email: `qr+${randomUUID()}@example.com`, passwordHash: "hash", name: "QR" });
    userId = user.id;
    const ws = await createWorkspace({ name: "QR WS", ownerUserId: userId, planId: plan?.id });
    workspaceId = ws.id;
    await createMember({ userId, workspaceId, role: "owner" });
  });

  it("generates payload and creates report", async () => {
    const payload = await generateQuarterlyPayload({ workspaceId, year: 2024, quarter: 1 });
    expect(payload.headcount.totalEmployees).toBe(0);
    const result = await createOrUpdateQuarterlyReport({ workspaceId, year: 2024, quarter: 1, userId });
    expect(result.payload).toBeTruthy();
    expect(result.report.year).toBe(2024);
  });

  it("POST /api/app/reports/quarterly creates report", async () => {
    const { POST } = await import("@/app/api/app/reports/quarterly/route");
    const req = new NextRequest(new URL("http://localhost/api/app/reports/quarterly"), {
      method: "POST",
      body: JSON.stringify({ year: 2024, quarter: 2 }),
      headers: new Headers({ "content-type": "application/json" }),
    });
    req.cookies.set(SESSION_COOKIE, userId);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok?: boolean; payload?: unknown };
    expect(json.ok).toBe(true);
  });
});

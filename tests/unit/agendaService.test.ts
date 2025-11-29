import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { employees } from "@/drizzle/schema";
import { SESSION_COOKIE } from "@/lib/session";
import { createMember } from "@/repositories/memberRepository";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import { buildAgendaForManager } from "@/services/agendaService";

async function seedWorkspace() {
  const plan = await ensureDefaultTestPlan();
  const user = await createUser({ email: `agenda+${randomUUID()}@example.com`, passwordHash: "hash", name: "Manager" });
  const ws = await createWorkspace({ name: "Agenda WS", ownerUserId: user.id, planId: plan?.id });
  await createMember({ userId: user.id, workspaceId: ws.id, role: "owner" });
  db.insert(employees)
    .values({
      id: randomUUID(),
      workspaceId: ws.id,
      name: "Manager",
      position: "Lead",
      level: "Senior",
      primaryTrackId: null,
      trackLevelId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .run();
  return { userId: user.id, workspaceId: ws.id };
}

describe("agendaService", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("builds empty agenda for fresh workspace", async () => {
    const { workspaceId, userId } = await seedWorkspace();
    const items = await buildAgendaForManager({
      workspaceId,
      managerId: userId,
      fromDate: new Date().toISOString(),
      toDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    expect(Array.isArray(items)).toBe(true);
  });

  it("API /api/app/agenda returns ok", async () => {
    const { workspaceId, userId } = await seedWorkspace();
    void workspaceId;
    const { GET } = await import("@/app/api/app/agenda/route");
    const req = new NextRequest(new URL("http://localhost/api/app/agenda"));
    req.cookies.set(SESSION_COOKIE, userId);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok?: boolean; items?: unknown[] };
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.items)).toBe(true);
  });
});

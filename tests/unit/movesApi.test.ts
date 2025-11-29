import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { createMember } from "@/repositories/memberRepository";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createSkill } from "@/repositories/skillRepository";
import { createTrack } from "@/repositories/trackRepository";
import { createJobRole } from "@/services/movesService";
import { db } from "@/lib/db";
import { employees, employeeSkills } from "@/drizzle/schema";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import { SESSION_COOKIE } from "@/lib/session";

async function seedWorkspace() {
  const plan = await ensureDefaultTestPlan();
  const user = await createUser({
    email: `moves-api-${randomUUID()}@example.com`,
    passwordHash: "hash",
    name: "Moves API",
  });
  const workspace = await createWorkspace({
    name: "Moves API WS",
    ownerUserId: user.id,
    planId: plan?.id ?? null,
  });
  await createMember({ userId: user.id, workspaceId: workspace.id, role: "owner" });
  const track = await createTrack(workspace.id, { name: "Команда API", levels: [{ name: "L1", description: "" }] });
  const skill = await createSkill(workspace.id, { name: "API", type: "hard" });
  const skillLead = await createSkill(workspace.id, { name: "Leadership", type: "soft" });
  await createJobRole({
    workspaceId: workspace.id,
    name: "API Lead",
    description: null,
    levelBand: "Senior",
    isLeadership: true,
    requirements: [
      { skillId: skill.id, requiredLevel: 4, importance: "must_have" },
      { skillId: skillLead.id, requiredLevel: 4, importance: "must_have" },
    ],
  });
  const employeeId = randomUUID();
  db.insert(employees)
    .values({
      id: employeeId,
      workspaceId: workspace.id,
      name: "API Dev",
      position: "Backend",
      level: "Middle",
      primaryTrackId: track?.id ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .run();
  db.insert(employeeSkills)
    .values({
      employeeId,
      skillId: skill.id,
      level: 3,
    })
    .run();
  return { user, workspace, teamId: track?.id ?? "", skillId: skill.id };
}

describe("moves API", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("returns team summary for owner", async () => {
    const { user, teamId } = await seedWorkspace();
    const { GET } = await import("@/app/api/app/moves/teams/[teamId]/summary/route");
    const request = new NextRequest(new URL(`http://localhost/api/app/moves/teams/${teamId}/summary`));
    request.cookies.set(SESSION_COOKIE, user.id);
    const response = await GET(request, { params: { teamId } });
    expect(response.status).toBe(200);
    const json = (await response.json()) as { ok?: boolean; summary?: { team?: { teamId?: string } } };
    expect(json.ok).toBe(true);
    expect(json.summary?.team?.teamId).toBe(teamId);
  });

  it("generates scenario from risks via API", async () => {
    const { user, workspace, teamId } = await seedWorkspace();
    // второй кандидат, чтобы появился action develop
    const extraEmployee = randomUUID();
    db.insert(employees)
      .values({
        id: extraEmployee,
        workspaceId: workspace.id,
        name: "API Dev 2",
        position: "Backend",
        level: "Middle",
        primaryTrackId: teamId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
    // дополнительная роль без кандидатов, чтобы появился hire
    const rareSkill = await createSkill(workspace.id, { name: "Rare", type: "hard" });
    await createJobRole({
      workspaceId: workspace.id,
      name: "Rare Role",
      description: null,
      levelBand: "Senior",
      isLeadership: false,
      requirements: [
        { skillId: rareSkill.id, requiredLevel: 5, importance: "must_have" },
        { skillId: rareSkill.id, requiredLevel: 5, importance: "must_have" },
      ],
    });

    const { POST } = await import("@/app/api/app/moves/scenarios/suggest-from-risks/route");
    const request = new NextRequest(new URL("http://localhost/api/app/moves/scenarios/suggest-from-risks"), {
      method: "POST",
      body: JSON.stringify({ teamId }),
      headers: new Headers({ "content-type": "application/json" }),
    });
    request.cookies.set(SESSION_COOKIE, user.id);
    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = (await response.json()) as { ok?: boolean; scenario?: { actions?: Array<{ type: string }> } };
    expect(json.ok).toBe(true);
    expect(json.scenario?.actions?.length).toBeGreaterThan(0);
    expect(json.scenario?.actions?.some((action) => action.type === "hire")).toBe(true);
    expect(json.scenario?.actions?.some((action) => action.type === "develop" || action.type === "promote")).toBe(
      true,
    );
  });
});

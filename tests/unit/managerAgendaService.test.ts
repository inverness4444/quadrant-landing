import { randomUUID } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { employees, meetingAgendas, pilotRunTeams, pilotRuns, talentDecisions, tracks, users } from "@/drizzle/schema";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createMember } from "@/repositories/memberRepository";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import { getManagerAgenda } from "@/services/managerAgendaService";

async function seedWorkspace() {
  const plan = await ensureDefaultTestPlan();
  const user = await db
    .insert(users)
    .values({ id: randomUUID(), email: `mgr+${randomUUID()}@example.com`, passwordHash: "hash", name: "Manager", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .returning()
    .get();
  const workspace = await createWorkspace({ name: "Agenda WS", ownerUserId: user.id, size: "10-50", planId: plan?.id });
  await createMember({ userId: user.id, workspaceId: workspace.id, role: "owner" });
  return { userId: user.id, workspaceId: workspace.id };
}

describe("managerAgendaService", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("returns days with meetings and decisions", async () => {
    const { workspaceId, userId } = await seedWorkspace();
    const teamId = randomUUID();
    db.insert(tracks)
      .values({ id: teamId, workspaceId, name: "Team A", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .run();
    const managerEmpId = randomUUID();
    db.insert(employees)
      .values({
        id: managerEmpId,
        workspaceId,
        name: "Manager",
        position: "Lead",
        level: "Senior",
        primaryTrackId: teamId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
    const employeeId = randomUUID();
    db.insert(employees)
      .values({
        id: employeeId,
        workspaceId,
        name: "Engineer",
        position: "Dev",
        level: "Middle",
        primaryTrackId: teamId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
    const pilotId = randomUUID();
    const start = startOfWeekLocal(new Date());
    const meetingDate = addDaysLocal(start, 1).toISOString();
    db.insert(pilotRuns)
      .values({ id: pilotId, workspaceId, name: "Pilot", description: null, status: "active", ownerUserId: userId, targetCycleId: null, createdAt: meetingDate, updatedAt: meetingDate })
      .run();
    db.insert(pilotRunTeams)
      .values({ id: randomUUID(), pilotRunId: pilotId, teamId })
      .run();
    db.insert(meetingAgendas)
      .values({
        id: randomUUID(),
        workspaceId,
        reportId: null,
        type: "team_review",
        title: "Weekly",
        description: null,
        scheduledAt: meetingDate,
        durationMinutes: 30,
        createdByUserId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
    db.insert(talentDecisions)
      .values({
        id: randomUUID(),
        workspaceId,
        employeeId,
        type: "monitor_risk",
        sourceType: "manual",
        sourceId: null,
        status: "proposed",
        priority: "medium",
        title: "Risk decision",
        rationale: "",
        risks: null,
        timeframe: null,
        createdByUserId: userId,
        createdAt: new Date(meetingDate),
        updatedAt: new Date(meetingDate),
      })
      .run();

    const res = await getManagerAgenda({ workspaceId, userId, from: start, to: addDaysLocal(start, 6) });
    expect(res.days.length).toBe(7);
    const items = res.days.flatMap((d) => d.items);
    expect(items.some((i) => i.kind === "meeting")).toBe(true);
    expect(items.some((i) => i.kind === "decision_deadline" || i.kind === "action_from_home" || i.kind === "pilot_review")).toBe(true);
    // сортировка по priority: high перед medium перед low
    res.days.forEach((day) => {
      for (let i = 1; i < day.items.length; i++) {
        expect(priorityIndex(day.items[i - 1].priority)).toBeLessThanOrEqual(priorityIndex(day.items[i].priority));
      }
    });
  });
});

function priorityIndex(p: "high" | "medium" | "low") {
  if (p === "high") return 0;
  if (p === "medium") return 1;
  return 2;
}

function startOfWeekLocal(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDaysLocal(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

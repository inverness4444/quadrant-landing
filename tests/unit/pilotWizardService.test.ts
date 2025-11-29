import { randomUUID } from "crypto";
import { describe, expect, it, beforeEach } from "vitest";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createMember } from "@/repositories/memberRepository";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { createCustomPilotTemplate } from "@/services/pilotTemplateService";
import { buildPilotPreviewFromTemplate, createPilotFromTemplate } from "@/services/pilotWizardService";
import { db } from "@/lib/db";
import { employees } from "@/drizzle/schema";

async function seed() {
  const plan = await ensureDefaultTestPlan();
  const user = await createUser({ email: `wizard+${randomUUID()}@example.com`, passwordHash: "hash", name: "Wizard" });
  const ws = await createWorkspace({ name: "WS", ownerUserId: user.id, size: "10-50", planId: plan?.id });
  await createMember({ userId: user.id, workspaceId: ws.id, role: "owner" });
  const employeeId = randomUUID();
  db.insert(employees)
    .values({
      id: employeeId,
      workspaceId: ws.id,
      name: "Emp",
      position: "Role",
      level: "Middle",
      primaryTrackId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .run();
  return { user, ws, employeeId };
}

describe("pilotWizardService", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("builds preview and creates pilot", async () => {
    const { user, ws, employeeId } = await seed();
    const tpl = await createCustomPilotTemplate({
      workspaceId: ws.id,
      userId: user.id,
      data: { title: "Promo", description: "Desc", suggestedDurationWeeks: 4, steps: [{ title: "Step", suggestedDueOffsetWeeks: 2 }] },
    });
    const start = new Date();
    const preview = await buildPilotPreviewFromTemplate({ workspaceId: ws.id, employeeId, templateId: tpl.template.id, startDate: start });
    expect(preview.steps[0].dueDate).toBeTruthy();
    const { pilotId } = await createPilotFromTemplate({
      workspaceId: ws.id,
      userId: user.id,
      employeeId,
      templateId: tpl.template.id,
      startDate: start,
    });
    const pilot = await db.query.pilotRuns.findFirst({ where: (fields, { eq }) => eq(fields.id, pilotId) });
    expect(pilot?.templateId).toBe(tpl.template.id);
  });
});

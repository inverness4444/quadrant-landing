import { randomUUID } from "crypto";
import { describe, expect, it, beforeEach } from "vitest";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createMember } from "@/repositories/memberRepository";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { archivePilotTemplate, createCustomPilotTemplate, getPilotTemplateWithSteps, listPilotTemplates } from "@/services/pilotTemplateService";

async function seed() {
  const plan = await ensureDefaultTestPlan();
  const user = await createUser({ email: `tpl+${randomUUID()}@example.com`, passwordHash: "hash", name: "User" });
  const ws = await createWorkspace({ name: "WS", ownerUserId: user.id, size: "10-50", planId: plan?.id });
  await createMember({ userId: user.id, workspaceId: ws.id, role: "owner" });
  return { user, ws };
}

describe("pilotTemplateService", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("creates and lists templates", async () => {
    const { user, ws } = await seed();
    const created = await createCustomPilotTemplate({
      workspaceId: ws.id,
      userId: user.id,
      data: { title: "Template A", description: "Desc", steps: [{ title: "Step 1" }] },
    });
    expect(created.template.title).toBe("Template A");
    const list = await listPilotTemplates({ workspaceId: ws.id, includeGlobal: false });
    expect(list.find((t) => t.id === created.template.id)).toBeTruthy();
    const loaded = await getPilotTemplateWithSteps({ workspaceId: ws.id, templateId: created.template.id });
    expect(loaded?.steps.length).toBe(1);
    await archivePilotTemplate({ workspaceId: ws.id, templateId: created.template.id });
    const listNoArchived = await listPilotTemplates({ workspaceId: ws.id, includeGlobal: false });
    expect(listNoArchived.find((t) => t.id === created.template.id)).toBeUndefined();
  });
});

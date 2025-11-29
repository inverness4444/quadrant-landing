import { randomUUID } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { employees, questSteps } from "@/drizzle/schema";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import { assignQuestToEmployees, createQuest, getAssignmentsForEmployee, updateQuestStepProgress } from "@/services/questService";

describe("quest service", () => {
  let workspaceId: string;
  let employeeId: string;
  let questId: string;

  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
    const plan = await ensureDefaultTestPlan();
    const user = await createUser({
      email: `quester+${randomUUID()}@example.com`,
      passwordHash: "hash",
      name: "Quest Owner",
    });
    const workspace = await createWorkspace({
      name: "Quest Workspace",
      ownerUserId: user.id,
      size: "10-50",
      planId: plan?.id,
    });
    workspaceId = workspace.id;
    // create a fake employee
    employeeId = randomUUID();
    db.insert(employees)
      .values({
        id: employeeId,
        workspaceId,
        name: "Quest Tester",
        position: "Engineer",
        level: "Middle",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
    const quest = await createQuest({
      workspaceId,
      title: "Закрыть риск по навику",
      description: "Повысить покрытие навыка",
      goalType: "reduce_risk",
      priority: "medium",
      ownerEmployeeId: employeeId,
      steps: [
        { title: "Шаг 1", description: "Сделать задачу", order: 1, required: true },
        { title: "Шаг 2", description: "Написать документ", order: 2, required: false },
      ],
    });
    questId = quest.id;
  });

  it("creates quest with steps", async () => {
    const steps = await db.select().from(questSteps).where(eq(questSteps.questId, questId));
    expect(steps.length).toBe(2);
  });

  it("assigns quest and tracks progress", async () => {
    const createdAssignments = await assignQuestToEmployees({ questId, employeeIds: [employeeId] });
    expect(createdAssignments.length).toBe(1);
    const assignmentId = createdAssignments[0]?.id ?? randomUUID();

    const progress = await getAssignmentsForEmployee(employeeId, workspaceId);
    expect(progress.length).toBe(1);

    const step = await db.query.questSteps.findFirst({ where: eq(questSteps.questId, questId) });
    expect(step).not.toBeNull();
    const updated = await updateQuestStepProgress({
      questAssignmentId: assignmentId,
      stepId: step!.id,
      status: "done",
    });
    expect(updated).not.toBeNull();
  });
});

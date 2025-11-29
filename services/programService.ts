import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  programTemplates,
  workspacePrograms,
  type ProgramTemplate,
  type ProgramStatus,
  type WorkspaceProgram,
} from "@/drizzle/schema";

function parseIds(raw: string | null | undefined) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as string[];
  } catch {
    // ignore
  }
  return [];
}

function stringifyIds(ids: string[]) {
  return JSON.stringify(ids ?? []);
}

export async function listTemplates(): Promise<ProgramTemplate[]> {
  return db.select().from(programTemplates);
}

export async function getTemplateByCode(code: string): Promise<ProgramTemplate | null> {
  const rows = await db.select().from(programTemplates).where(eq(programTemplates.code, code));
  return rows[0] ?? null;
}

export async function listWorkspacePrograms(workspaceId: string, filter?: { status?: ProgramStatus | "all" }) {
  const conditions = [eq(workspacePrograms.workspaceId, workspaceId)];
  if (filter?.status && filter.status !== "all") {
    conditions.push(eq(workspacePrograms.status, filter.status));
  }
  return db.select().from(workspacePrograms).where(and(...conditions));
}

export async function getWorkspaceProgram(workspaceId: string, programId: string) {
  const rows = await db
    .select()
    .from(workspacePrograms)
    .where(and(eq(workspacePrograms.workspaceId, workspaceId), eq(workspacePrograms.id, programId)));
  if (!rows[0]) return null;
  return {
    ...rows[0],
    targetEmployeeIds: parseIds(rows[0].targetEmployeeIds),
  };
}

export async function createWorkspaceProgram(input: {
  workspaceId: string;
  templateCode: string;
  ownerId: string;
  name?: string;
  descriptionOverride?: string;
  targetEmployeeIds: string[];
  plannedEndAt?: string | null;
}) {
  const template = await getTemplateByCode(input.templateCode);
  if (!template) {
    throw new Error("PROGRAM_TEMPLATE_NOT_FOUND");
  }
  const now = new Date().toISOString();
  const plannedEndAt =
    input.plannedEndAt ??
    new Date(Date.now() + template.defaultDurationDays * 24 * 60 * 60 * 1000).toISOString();
  const program: WorkspaceProgram = {
    id: randomUUID(),
    workspaceId: input.workspaceId,
    templateCode: template.code,
    name: input.name || template.name,
    description: input.descriptionOverride || template.description,
    ownerId: input.ownerId,
    status: "draft",
    startedAt: null,
    plannedEndAt,
    actualEndAt: null,
    targetEmployeeIds: stringifyIds(input.targetEmployeeIds),
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(workspacePrograms).values(program).run();
  return program;
}

export async function updateWorkspaceProgramStatus(input: {
  workspaceId: string;
  programId: string;
  status: ProgramStatus;
  actualEndAt?: string | null;
}) {
  const now = new Date().toISOString();
  const updates: Partial<WorkspaceProgram> = {
    status: input.status,
    updatedAt: now,
  };
  if (input.status === "active") {
    updates.startedAt = now;
  }
  if (input.status === "completed") {
    updates.actualEndAt = input.actualEndAt ?? now;
  }
  await db
    .update(workspacePrograms)
    .set(updates)
    .where(and(eq(workspacePrograms.workspaceId, input.workspaceId), eq(workspacePrograms.id, input.programId)))
    .run();
  return getWorkspaceProgram(input.workspaceId, input.programId);
}

export async function launchProgram(input: { workspaceId: string; programId: string }) {
  const program = await getWorkspaceProgram(input.workspaceId, input.programId);
  if (!program) throw new Error("PROGRAM_NOT_FOUND");
  // TODO: автосоздание пилотов/целей/опросов. Пока только статус.
  return updateWorkspaceProgramStatus({ workspaceId: input.workspaceId, programId: input.programId, status: "active" });
}

export const programIdHelpers = { parseIds, stringifyIds };

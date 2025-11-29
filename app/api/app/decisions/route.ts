import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { createDecision, listDecisions, updateDecisionStatus } from "@/services/talentDecisionService";
import { requireRole } from "@/services/rbac";
import { authRequiredError, forbiddenError, internalError, respondWithApiError, validationError } from "@/services/apiError";

const statusEnum = z.enum(["proposed", "approved", "implemented", "rejected"]);
const typeEnum = z.enum(["promote", "lateral_move", "role_change", "keep_in_place", "hire_external", "monitor_risk"]);
const priorityEnum = z.enum(["low", "medium", "high"]);
const sourceEnum = z.enum(["pilot", "report", "meeting", "manual"]);

const createSchema = z.object({
  employeeId: z.string(),
  type: typeEnum,
  priority: priorityEnum.default("medium"),
  sourceType: sourceEnum,
  sourceId: z.string().optional().nullable(),
  status: statusEnum.optional(),
  title: z.string().min(3),
  rationale: z.string().min(3),
  risks: z.string().optional().nullable(),
  timeframe: z.string().optional().nullable(),
});

const statusUpdateSchema = z.object({
  decisionId: z.string(),
  status: statusEnum,
});

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const params = request.nextUrl.searchParams;
  const statusParams = params.getAll("status").filter(Boolean);
  const typeParams = params.getAll("type").filter(Boolean);
  const filters: {
    employeeId?: string;
    teamId?: string;
    status?: string[];
    type?: string[];
    onlyOpen?: boolean;
    sourceType?: string;
    sourceId?: string;
  } = {
    employeeId: params.get("employeeId") ?? undefined,
    teamId: params.get("teamId") ?? undefined,
    status: statusParams.length ? statusParams : undefined,
    type: typeParams.length ? typeParams : undefined,
    onlyOpen: params.get("onlyOpen") === "true" || params.get("onlyOpen") === "1",
    sourceType: params.get("sourceType") ?? undefined,
    sourceId: params.get("sourceId") ?? undefined,
  };
  try {
    const decisions = await listDecisions({ workspaceId: context.workspace.id, filters });
    return NextResponse.json({ ok: true, decisions });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "decisions:list" }));
  }
}

export async function POST(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const decision = await createDecision({
      workspaceId: context.workspace.id,
      createdByUserId: context.user.id,
      ...parsed.data,
    });
    return NextResponse.json({ ok: true, decision });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "decisions:create" }));
  }
}

export async function PATCH(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const json = await request.json().catch(() => null);
  const parsed = statusUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const decision = await updateDecisionStatus({
      workspaceId: context.workspace.id,
      userId: context.user.id,
      decisionId: parsed.data.decisionId,
      status: parsed.data.status,
    });
    return NextResponse.json({ ok: true, decision });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "decisions:updateStatus" }));
  }
}

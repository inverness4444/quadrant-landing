import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { listRiskCases, createRiskCase } from "@/services/riskCenterService";
import { requireMember, requireRole } from "@/services/rbac";

const statusEnum = z.enum(["open", "monitoring", "resolved"]);
const levelEnum = z.enum(["low", "medium", "high"]);

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireMember(context.workspace.id, context.user.id);
  } catch {
    return respondWithApiError(forbiddenError());
  }

  const params = request.nextUrl.searchParams;
  const parsedStatuses = params
    .getAll("statuses")
    .map((s) => statusEnum.safeParse(s))
    .filter((entry): entry is z.SafeParseSuccess<z.infer<typeof statusEnum>> => entry.success)
    .map((entry) => entry.data);
  const parsedLevels = params
    .getAll("levels")
    .map((s) => levelEnum.safeParse(s))
    .filter((entry): entry is z.SafeParseSuccess<z.infer<typeof levelEnum>> => entry.success)
    .map((entry) => entry.data);

  const onlyMine = params.get("onlyMine") === "true" || params.get("onlyMine") === "1";
  const search = params.get("search") ?? undefined;
  const limit = params.get("limit") ? Number(params.get("limit")) : undefined;
  const offset = params.get("offset") ? Number(params.get("offset")) : undefined;

  try {
    const result = await listRiskCases({
      workspaceId: context.workspace.id,
      statuses: parsedStatuses.length ? parsedStatuses : undefined,
      levels: parsedLevels.length ? parsedLevels : undefined,
      search,
      limit,
      offset,
      ownerUserId: onlyMine ? context.user.id : undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "risk-center:cases:list" }));
  }
}

const createSchema = z.object({
  employeeId: z.string(),
  level: levelEnum,
  title: z.string().min(3),
  reason: z.string().optional(),
  recommendation: z.string().optional(),
  ownerUserId: z.string().optional(),
});

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
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const riskCase = await createRiskCase({
      workspaceId: context.workspace.id,
      employeeId: parsed.data.employeeId,
      level: parsed.data.level,
      source: "manual",
      title: parsed.data.title,
      reason: parsed.data.reason,
      recommendation: parsed.data.recommendation,
      ownerUserId: parsed.data.ownerUserId,
      createdByUserId: context.user.id,
    });
    return NextResponse.json({ ok: true, case: riskCase });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "risk-center:cases:create" }));
  }
}

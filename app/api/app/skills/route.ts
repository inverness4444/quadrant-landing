import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { createSkill } from "@/repositories/skillRepository";
import { getSkillPage } from "@/services/skillData";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";

const payloadSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["hard", "soft", "product", "data"]),
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
  const json = await request.json();
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const skill = await createSkill(context.workspace.id, parsed.data);
    return NextResponse.json({ ok: true, skill });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "skills:create" }));
  }
}

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  const params = request.nextUrl.searchParams;
  const page = Number(params.get("page") ?? "1");
  const pageSize = Number(params.get("pageSize") ?? "20");
  if (Number.isNaN(page) || Number.isNaN(pageSize)) {
    return respondWithApiError(validationError({ page: ["Некорректные параметры пагинации"] }));
  }
  const filters = {
    page: Math.max(1, page),
    pageSize: Math.min(100, Math.max(1, pageSize)),
    search: params.get("search") ?? undefined,
    type: (() => {
      const typeParam = params.get("type");
      switch (typeParam) {
        case "hard":
        case "soft":
        case "product":
        case "data":
        case "all":
          return typeParam;
        default:
          return "all";
      }
    })(),
  };
  const result = await getSkillPage(context.workspace.id, filters);
  return NextResponse.json({ ok: true, ...result });
}

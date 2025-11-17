import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { findSkillById } from "@/repositories/skillRepository";
import { getSkillArtifactsPage } from "@/services/skillData";
import { authRequiredError, notFoundError, respondWithApiError, validationError } from "@/services/apiError";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }

  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = Number(request.nextUrl.searchParams.get("pageSize") ?? "5");
  if (Number.isNaN(page) || Number.isNaN(pageSize)) {
    return respondWithApiError(validationError({ page: ["Некорректные параметры пагинации"] }));
  }

  const skill = await findSkillById(id);
  if (!skill || skill.workspaceId !== context.workspace.id) {
    return respondWithApiError(notFoundError("Навык не найден"));
  }

  const result = await getSkillArtifactsPage(context.workspace.id, skill.id, page, pageSize);
  return NextResponse.json({ ok: true, ...result });
}

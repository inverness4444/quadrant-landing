import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError } from "@/services/apiError";
import { getProgramOutcome, upsertProgramOutcome } from "@/services/outcomeService";
import { requireRole } from "@/services/rbac";

const metricSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.union([z.string(), z.number()]),
  unit: z.string().optional(),
  direction: z.enum(["up", "down", "neutral"]).optional(),
});

const bodySchema = z.object({
  summaryTitle: z.string().min(1),
  summaryText: z.string().min(1),
  metrics: z.array(metricSchema).default([]),
  sentiment: z.enum(["positive", "neutral", "negative"]).default("neutral"),
  recommendations: z.string().default(""),
});

type Params = { params: { id: string } };

export async function GET(request: Request, { params }: Params) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  try {
    const data = await getProgramOutcome(context.workspace.id, params.id);
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "outcomes:program:get" }));
  }
}

export async function POST(request: Request, { params }: Params) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  try {
    const body = bodySchema.parse(await request.json());
    const result = await upsertProgramOutcome({
      workspaceId: context.workspace.id,
      programId: params.id,
      summaryTitle: body.summaryTitle,
      summaryText: body.summaryText,
      metrics: body.metrics,
      sentiment: body.sentiment,
      recommendations: body.recommendations,
      createdBy: context.user.id,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "outcomes:program:post" }));
  }
}

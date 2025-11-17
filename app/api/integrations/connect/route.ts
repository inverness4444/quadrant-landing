import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { requireRole } from "@/services/rbac";
import { AVAILABLE_INTEGRATIONS } from "@/integrations/types";
import {
  createIntegration,
  findIntegrationByWorkspaceAndType,
  updateIntegration,
} from "@/repositories/integrationRepository";
import { canAddIntegration } from "@/services/planLimits";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  planLimitError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";

const typeEnum = z.enum(["github", "jira", "notion"]);

const schema = z.object({
  type: typeEnum,
  config: z.record(z.string(), z.any()).optional(),
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }

  const descriptor = AVAILABLE_INTEGRATIONS.find((item) => item.type === parsed.data.type);
  if (!descriptor) {
    return respondWithApiError(validationError({ type: ["Неизвестная интеграция"] }));
  }

  const existing = await findIntegrationByWorkspaceAndType(context.workspace.id, parsed.data.type);
  if (!existing) {
    const check = await canAddIntegration(context.workspace.id);
    if (!check.allowed) {
      return respondWithApiError(planLimitError(check.reason ?? "Достигнут лимит интеграций"));
    }
  } else if (existing.status !== "connected") {
    const check = await canAddIntegration(context.workspace.id);
    if (!check.allowed) {
      return respondWithApiError(planLimitError(check.reason ?? "Достигнут лимит интеграций"));
    }
  }

  try {
    const integration =
      existing &&
      (await updateIntegration(existing.id, {
        status: "connected",
      }));

    if (!integration) {
      const created = await createIntegration({
        workspaceId: context.workspace.id,
        type: parsed.data.type,
        config: parsed.data.config ?? {},
        status: "connected",
      });
      return NextResponse.json({
        ok: true,
        integration: created
          ? {
              id: created.id,
              type: created.type,
              status: created.status,
              lastSyncedAt: created.lastSyncedAt,
            }
          : null,
      });
    }

    return NextResponse.json({
      ok: true,
      integration: integration
        ? {
            id: integration.id,
            type: integration.type,
            status: integration.status,
            lastSyncedAt: integration.lastSyncedAt,
          }
        : null,
    });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "integrations/connect" }));
  }
}

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notificationSettings } from "@/drizzle/schema";

export type NotificationSettingsDTO = {
  id: string;
  workspaceId: string;
  userId: string;
  emailEnabled: boolean;
  emailDailyDigest: boolean;
  emailWeeklyDigest: boolean;
  inAppEnabled: boolean;
  timezone: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapSettings(row: typeof notificationSettings.$inferSelect): NotificationSettingsDTO {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    emailEnabled: !!row.emailEnabled,
    emailDailyDigest: !!row.emailDailyDigest,
    emailWeeklyDigest: !!row.emailWeeklyDigest,
    inAppEnabled: !!row.inAppEnabled,
    timezone: row.timezone ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getOrCreateNotificationSettings(input: { workspaceId: string; userId: string }) {
  const existing = await db.query.notificationSettings.findFirst({
    where: (fields, { and, eq }) => and(eq(fields.workspaceId, input.workspaceId), eq(fields.userId, input.userId)),
  });
  if (existing) return mapSettings(existing);
  const id = randomUUID();
  const now = new Date().toISOString();
  db.insert(notificationSettings)
    .values({
      id,
      workspaceId: input.workspaceId,
      userId: input.userId,
      emailEnabled: true,
      emailDailyDigest: true,
      emailWeeklyDigest: false,
      inAppEnabled: true,
      timezone: null,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  const created = await db.query.notificationSettings.findFirst({
    where: (fields, { eq, and }) => and(eq(fields.id, id), eq(fields.workspaceId, input.workspaceId)),
  });
  return created ? mapSettings(created) : null;
}

export async function updateNotificationSettings(input: {
  workspaceId: string;
  userId: string;
  patch: Partial<Omit<NotificationSettingsDTO, "id" | "workspaceId" | "userId" | "createdAt" | "updatedAt">>;
}) {
  const existing = await getOrCreateNotificationSettings({ workspaceId: input.workspaceId, userId: input.userId });
  if (!existing) throw new Error("SETTINGS_CREATE_FAILED");
  db.update(notificationSettings)
    .set({
      emailEnabled: input.patch.emailEnabled ?? existing.emailEnabled,
      emailDailyDigest: input.patch.emailDailyDigest ?? existing.emailDailyDigest,
      emailWeeklyDigest: input.patch.emailWeeklyDigest ?? existing.emailWeeklyDigest,
      inAppEnabled: input.patch.inAppEnabled ?? existing.inAppEnabled,
      timezone: input.patch.timezone ?? existing.timezone,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(notificationSettings.id, existing.id))
    .run();
  const updated = await db.query.notificationSettings.findFirst({ where: (fields, { eq }) => eq(fields.id, existing.id) });
  return updated ? mapSettings(updated) : null;
}

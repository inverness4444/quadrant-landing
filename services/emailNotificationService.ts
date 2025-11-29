import { subDays } from "date-fns";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/drizzle/schema";
import { getOrCreateNotificationSettings } from "@/services/notificationSettingsService";

export async function buildDailyDigestForUser(workspaceId: string, userId: string) {
  const since = subDays(new Date(), 1).toISOString();
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.workspaceId, workspaceId), eq(notifications.userId, userId), gte(notifications.createdAt, since)));
  return rows;
}

export async function sendDailyDigest(workspaceId: string, userId: string) {
  const settings = await getOrCreateNotificationSettings({ workspaceId, userId });
  if (!settings?.emailEnabled || !settings.emailDailyDigest) return;
  const digest = await buildDailyDigestForUser(workspaceId, userId);
  if (!digest.length) return;
  // TODO: integrate real email sender
  // sendEmail(userId, `Ежедневный дайджест Quadrant`, renderDigest(digest))
  console.info(`Daily digest for ${userId} (${workspaceId}): ${digest.length} notifications`);
}

// Placeholder for cron hook
export async function runDailyDigestJob(workspaceId: string, userIds: string[]) {
  for (const userId of userIds) {
    await sendDailyDigest(workspaceId, userId);
  }
}

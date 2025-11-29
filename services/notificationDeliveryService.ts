import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { notificationChannels, users } from "@/drizzle/schema";
import { type NotificationDTO } from "@/services/types/notification";
import { sendEmail, buildNotificationEmail } from "@/services/emailService";
import { buildSlackMessageFromNotification, sendSlackMessage } from "@/services/slackService";
import { and, eq } from "drizzle-orm";

type Channel = "email" | "slack";

export async function sendImmediateNotification(input: { notification: NotificationDTO; channels?: Channel[] }) {
  const channels = input.channels;
  try {
    const user = await db.query.users.findFirst({ where: eq(users.id, input.notification.userId) });
    const channelRows = await db
      .select()
      .from(notificationChannels)
      .where(and(eq(notificationChannels.workspaceId, input.notification.workspaceId), eq(notificationChannels.userId, input.notification.userId)));

    const channelTypes = channels ?? channelRows.map((c) => c.type as Channel);
    for (const channel of channelTypes) {
      if (channel === "email") {
        const target = channelRows.find((c) => c.type === "email")?.target ?? user?.email;
        if (!target) continue;
        const template = buildNotificationEmail({ title: input.notification.title, body: input.notification.body, link: input.notification.url ?? undefined });
        await sendEmail({ to: target, subject: template.subject, text: template.text, html: template.html });
      }
      if (channel === "slack") {
        const target = channelRows.find((c) => c.type === "slack")?.target ?? process.env.SLACK_DEFAULT_WEBHOOK_URL;
        if (!target) continue;
        const message = buildSlackMessageFromNotification({
          title: input.notification.title,
          body: input.notification.body,
          link: input.notification.url ?? undefined,
        });
        await sendSlackMessage({ webhookUrl: target, message });
      }
    }
  } catch (error) {
    console.warn("notificationDelivery failed", error);
  }
}

export async function sendDailyDigest(_input: { workspaceId: string; userId: string; date: Date }) {
  void _input;
  // TODO: агрегировать уведомления/agenda и отправлять пачкой
  return;
}

export async function sendWeeklyDigest(_input: { workspaceId: string; userId: string; weekStart: Date; weekEnd: Date }) {
  void _input;
  // TODO: агрегировать Company/Team Health и отправлять
  return;
}

export async function upsertNotificationChannel(input: {
  workspaceId: string;
  userId?: string | null;
  type: Channel;
  target: string;
  isEnabled?: boolean;
  preferences?: string;
}) {
  const id = randomUUID();
  const existing = await db.query.notificationChannels.findFirst({
    where: and(
      eq(notificationChannels.workspaceId, input.workspaceId),
      eq(notificationChannels.userId, input.userId ?? null),
      eq(notificationChannels.type, input.type),
    ),
  });
  if (existing) {
    await db
      .update(notificationChannels)
      .set({
        target: input.target,
        isEnabled: input.isEnabled ?? existing.isEnabled,
        preferences: input.preferences ?? existing.preferences,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(notificationChannels.id, existing.id));
    return { id: existing.id };
  }
  await db.insert(notificationChannels).values({
    id,
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
    type: input.type,
    target: input.target,
    isEnabled: input.isEnabled ?? true,
    preferences: input.preferences ?? "[]",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return { id };
}

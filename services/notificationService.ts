import { and, desc, eq, or, gte } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import {
  notifications,
  type NotificationEntityType,
  type NotificationType,
} from "@/drizzle/schema";
import type { NotificationDTO } from "@/services/types/notification";
import { count } from "drizzle-orm";
import { sendImmediateNotification } from "@/services/notificationDeliveryService";

export async function getUserNotifications(input: {
  workspaceId: string;
  userId: string;
  onlyUnread?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ items: NotificationDTO[]; total: number; unreadCount: number }> {
  const conditions = [eq(notifications.workspaceId, input.workspaceId), eq(notifications.userId, input.userId)] as const;
  const active = and(...conditions, orExpiresAt());
  const where = input.onlyUnread ? and(active, eq(notifications.isRead, false)) : active;
  const totalRows = await db.select({ count: notifications.id }).from(notifications).where(where);
  const unreadRows = await db.select({ count: notifications.id }).from(notifications).where(and(active, eq(notifications.isRead, false)));
  const query = db.select().from(notifications).where(where).orderBy(desc(notifications.priority), desc(notifications.createdAt));
  const paged = input.limit ? query.limit(input.limit).offset(input.offset ?? 0) : query;
  const rows = await paged;
  return {
    items: rows.map(mapNotification),
    total: Number((totalRows[0] as { count: number } | undefined)?.count ?? rows.length),
    unreadCount: Number((unreadRows[0] as { count: number } | undefined)?.count ?? 0),
  };
}

export async function countUnreadNotifications(input: { workspaceId: string; userId: string }) {
  const rows = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.workspaceId, input.workspaceId), eq(notifications.userId, input.userId), eq(notifications.isRead, false)));
  return Number((rows[0] as { value: number } | undefined)?.value ?? 0);
}

export async function createNotification(input: {
  workspaceId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  url?: string;
  priority?: number;
  expiresAt?: string | null;
}): Promise<NotificationDTO> {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.insert(notifications)
    .values({
      id,
      workspaceId: input.workspaceId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      url: input.url ?? null,
      isRead: false,
      readAt: null,
      expiresAt: input.expiresAt ?? null,
      priority: input.priority ?? 2,
      createdAt: now,
    })
    .run();
  const dto: NotificationDTO = {
    id,
    workspaceId: input.workspaceId,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    url: input.url ?? null,
    isRead: false,
    readAt: null,
    expiresAt: input.expiresAt ?? null,
    priority: input.priority ?? 2,
    createdAt: now,
  };
  // fire-and-forget delivery to external channels
  void sendImmediateNotification({ notification: dto }).catch(() => {});
  return dto;
}

export async function getUnreadNotifications(input: { workspaceId: string; userId: string; limit?: number }): Promise<NotificationDTO[]> {
  const res = await getUserNotifications({ ...input, onlyUnread: true, limit: input.limit ?? 20 });
  return res.items;
}

export async function getAllNotifications(input: {
  workspaceId: string;
  userId: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: NotificationDTO[]; total: number }> {
  const result = await getUserNotifications({
    workspaceId: input.workspaceId,
    userId: input.userId,
    limit: input.limit,
    offset: input.offset,
  });
  return { items: result.items, total: result.total };
}

export async function markNotificationRead(input: {
  workspaceId: string;
  userId: string;
  notificationId: string;
}) {
  db.update(notifications)
    .set({ isRead: true, readAt: new Date().toISOString() })
    .where(
      and(
        eq(notifications.id, input.notificationId),
        eq(notifications.workspaceId, input.workspaceId),
        eq(notifications.userId, input.userId),
      ),
    )
    .run();
}

export async function markAllNotificationsRead(input: { workspaceId: string; userId: string }) {
  db.update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.workspaceId, input.workspaceId), eq(notifications.userId, input.userId)))
    .run();
}

export async function archiveNotification(input: { workspaceId: string; userId: string; notificationId: string }) {
  db.update(notifications)
    .set({ isArchived: true })
    .where(
      and(
        eq(notifications.id, input.notificationId),
        eq(notifications.workspaceId, input.workspaceId),
        eq(notifications.userId, input.userId),
      ),
    )
    .run();
}

function mapNotification(row: typeof notifications.$inferSelect): NotificationDTO {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    type: row.type,
    title: row.title,
    body: row.body,
    entityType: row.entityType ?? null,
    entityId: row.entityId ?? null,
    url: row.url ?? null,
    isRead: Boolean(row.isRead),
    isArchived: Boolean((row as { isArchived?: number | boolean }).isArchived ?? false),
    readAt: row.readAt ?? null,
    expiresAt: row.expiresAt ?? null,
    priority: row.priority ?? 2,
    createdAt: row.createdAt,
  };
}

function orExpiresAt() {
  const now = new Date().toISOString();
  return or(eq(notifications.expiresAt, null), gte(notifications.expiresAt, now));
}

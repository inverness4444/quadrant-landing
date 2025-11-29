import type { NotificationEntityType, NotificationType } from "@/drizzle/schema";

export type NotificationDTO = {
  id: string;
  workspaceId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType: NotificationEntityType | null;
  entityId: string | null;
  url: string | null;
  isRead: boolean;
  isArchived?: boolean;
  priority?: number;
  readAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
};

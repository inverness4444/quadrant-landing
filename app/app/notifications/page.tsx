import { requireWorkspaceContext } from "@/lib/workspaceContext";
import NotificationsClient from "@/components/app/notifications/NotificationsClient";
import { getUserNotifications } from "@/services/notificationService";

export default async function NotificationsPage() {
  const { workspace, user } = await requireWorkspaceContext();
  const { items } = await getUserNotifications({ workspaceId: workspace.id, userId: user.id, onlyUnread: false, limit: 50 });
  return <NotificationsClient initialNotifications={items} workspaceId={workspace.id} userId={user.id} />;
}

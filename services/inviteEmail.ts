import { logger } from "@/services/logger";
import { env } from "@/config/env";
import { getMailTransport } from "@/services/mailTransport";

const resolveBaseUrl = () => {
  const fallback = "http://localhost:3000";
  const url = env.baseUrl ?? fallback;
  return url.replace(/\/+$/, "");
};

export async function sendInviteEmail({
  email,
  workspaceName,
  token,
}: {
  email: string;
  workspaceName: string;
  token: string;
}) {
  const transporter = getMailTransport();
  if (!transporter || !env.smtp.user) {
    logger.warn("Invite email transport not configured, skipping invite notification");
    return;
  }

  const link = `${resolveBaseUrl()}/auth/accept-invite?token=${encodeURIComponent(token)}`;
  try {
    await transporter.sendMail({
      from: `"Quadrant" <${env.smtp.user}>`,
      to: email,
      subject: `Приглашение в Quadrant`,
      text: `Вас пригласили присоединиться к workspace "${workspaceName}" в Quadrant.\n\nНажмите на ссылку ниже, чтобы принять приглашение:\n${link}\n\nЕсли вы не ожидали этого письма, просто проигнорируйте его.`,
    });
  } catch (error) {
    logger.error("Failed to send invite email", { error: (error as Error).message, email });
  }
}

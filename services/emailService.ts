import type { Lead } from "@/drizzle/schema";
import { logger } from "@/services/logger";
import { env } from "@/config/env";
import { getMailTransport } from "@/services/mailTransport";

export async function sendLeadNotification(lead: Lead) {
  const transporter = getMailTransport();
  const recipient = env.smtp.recipient;
  if (!transporter || !recipient || !env.smtp.user) {
    logger.warn("Email transport not configured, skipping notification");
    return;
  }

  await transporter.sendMail({
    from: `"Quadrant" <${env.smtp.user}>`,
    to: recipient,
    subject: `Новая заявка с сайта — ${lead.company}`,
    text: `
Имя: ${lead.name}
Email: ${lead.email}
Компания: ${lead.company}
Размер: ${lead.headcount}
Сообщение:
${lead.message}
    `.trim(),
  });
}

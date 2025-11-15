import nodemailer from "nodemailer";
import type { Lead } from "@/drizzle/schema";
import { logger } from "@/services/logger";

const {
  CONTACT_SMTP_HOST,
  CONTACT_SMTP_PORT,
  CONTACT_SMTP_USER,
  CONTACT_SMTP_PASS,
  CONTACT_RECIPIENT_EMAIL,
} = process.env;

let transporter: nodemailer.Transporter | null = null;

if (
  CONTACT_SMTP_HOST &&
  CONTACT_SMTP_PORT &&
  CONTACT_SMTP_USER &&
  CONTACT_SMTP_PASS
) {
  transporter = nodemailer.createTransport({
    host: CONTACT_SMTP_HOST,
    port: Number(CONTACT_SMTP_PORT),
    secure: Number(CONTACT_SMTP_PORT) === 465,
    auth: {
      user: CONTACT_SMTP_USER,
      pass: CONTACT_SMTP_PASS,
    },
  });
}

export async function sendLeadNotification(lead: Lead) {
  if (!transporter || !CONTACT_RECIPIENT_EMAIL) {
    logger.warn("Email transport not configured, skipping notification");
    return;
  }

  await transporter.sendMail({
    from: `"Quadrant" <${CONTACT_SMTP_USER}>`,
    to: CONTACT_RECIPIENT_EMAIL,
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

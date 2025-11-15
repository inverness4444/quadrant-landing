import nodemailer from "nodemailer";
import { logger } from "@/services/logger";

const {
  CONTACT_SMTP_HOST,
  CONTACT_SMTP_PORT,
  CONTACT_SMTP_USER,
  CONTACT_SMTP_PASS,
} = process.env;

let transporter: nodemailer.Transporter | null = null;

if (CONTACT_SMTP_HOST && CONTACT_SMTP_PORT && CONTACT_SMTP_USER && CONTACT_SMTP_PASS) {
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

const resolveBaseUrl = () => {
  const fallback = "http://localhost:3000";
  const url = process.env.BASE_URL ?? fallback;
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
  if (!transporter || !CONTACT_SMTP_USER) {
    logger.warn("Invite email transport not configured, skipping invite notification");
    return;
  }

  const link = `${resolveBaseUrl()}/auth/accept-invite?token=${encodeURIComponent(token)}`;
  try {
    await transporter.sendMail({
      from: `"Quadrant" <${CONTACT_SMTP_USER}>`,
      to: email,
      subject: `Приглашение в Quadrant`,
      text: `Вас пригласили присоединиться к workspace "${workspaceName}" в Quadrant.\n\nНажмите на ссылку ниже, чтобы принять приглашение:\n${link}\n\nЕсли вы не ожидали этого письма, просто проигнорируйте его.`,
    });
  } catch (error) {
    logger.error("Failed to send invite email", { error: (error as Error).message, email });
  }
}

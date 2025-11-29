import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const smtpUser = process.env.SMTP_USER;
const smtpPassword = process.env.SMTP_PASSWORD;
const emailFrom = process.env.EMAIL_FROM ?? "no-reply@quadrant.local";

const transporter =
  smtpHost && smtpUser && smtpPassword
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPassword },
      })
    : null;

export async function sendEmail(params: { to: string; subject: string; html?: string; text?: string }) {
  if (!transporter) {
    throw new Error("SMTP_NOT_CONFIGURED");
  }
  await transporter.sendMail({
    from: emailFrom,
    to: params.to,
    subject: params.subject,
    text: params.text ?? params.html ?? "",
    html: params.html ?? params.text ?? "",
  });
}

export function buildNotificationEmail(input: { title: string; body: string; link?: string | null }) {
  const subject = `[Quadrant] ${input.title}`;
  const text = `${input.body}${input.link ? `\n\nОткрыть: ${input.link}` : ""}`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
  <p style="font-size:16px;font-weight:600;margin:0 0 8px 0">${input.title}</p>
  <p style="margin:0 0 12px 0">${input.body}</p>
  ${input.link ? `<p><a href="${input.link}" style="color:#4f46e5;font-weight:600">Открыть в Quadrant</a></p>` : ""}
</div>`;
  return { subject, text, html };
}


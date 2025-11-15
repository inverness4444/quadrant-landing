import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { saveLead } from "@/repositories/leadRepository";
import { sendLeadNotification } from "@/services/emailService";
import { logger } from "@/services/logger";
import { contactSchema } from "@/lib/contactValidation";
import { monitoringService } from "@/services/monitoringService";
import { isRateLimited } from "@/lib/rateLimiter";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) {
    logger.warn("Rate limit triggered", { ip });
    return NextResponse.json({ ok: false, error: "Слишком много запросов" }, { status: 429 });
  }

  const raw = await request.json();
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.errors.forEach((err) => {
      if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
    });
    return NextResponse.json({ ok: false, errors: fieldErrors }, { status: 400 });
  }

  const { honeypot, renderedAt, submittedAt, ...data } = parsed.data;

  if (honeypot) {
    logger.warn("Contact form honeypot triggered");
    return NextResponse.json({ ok: true });
  }

  const submissionTime =
    typeof renderedAt === "number" && typeof submittedAt === "number"
      ? submittedAt - renderedAt
      : null;
  const suspicious = !!submissionTime && submissionTime < 2000;

  const lead = {
    id: uuid(),
    name: data.name.trim(),
    email: data.email.trim(),
    company: data.company.trim(),
    headcount: data.headcount,
    message: data.message.trim(),
    createdAt: new Date().toISOString(),
    suspicious,
  };

  await saveLead(lead);

  try {
    await sendLeadNotification(lead);
  } catch (error) {
    logger.error("Failed to send lead notification", { error });
    monitoringService.captureException(error, { source: "contact-email" });
  }

  logger.info("Lead received", { id: lead.id, suspicious });

  return NextResponse.json({ ok: true });
}

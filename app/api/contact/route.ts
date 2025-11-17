import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { saveLead } from "@/repositories/leadRepository";
import { sendLeadNotification } from "@/services/emailService";
import { logger } from "@/services/logger";
import { contactSchema } from "@/lib/contactValidation";
import { trackError, trackEvent } from "@/services/monitoring";
import { rateLimitRequest } from "@/services/rateLimit";

export async function POST(request: NextRequest) {
  const limiter = rateLimitRequest(request, "contact", 5, 60_000);
  if (!limiter.allowed) {
    logger.warn("Contact form rate limit triggered", { key: limiter.key });
    return NextResponse.json(
      { ok: false, error: "Слишком много запросов", code: "RATE_LIMITED", retryAfter: limiter.retryAfter },
      { status: 429 },
    );
  }

  const raw = await request.json();
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      if (issue.path[0]) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
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
    trackError(error, { source: "contact-email" });
  }

  logger.info("Lead received", { id: lead.id, suspicious });
  trackEvent("contact_submission", { leadId: lead.id, suspicious });

  return NextResponse.json({ ok: true });
}

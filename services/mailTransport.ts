import nodemailer from "nodemailer";
import { env } from "@/config/env";

let cached: nodemailer.Transporter | null = null;

export function getMailTransport() {
  if (cached) {
    return cached;
  }
  const { host, port, user, pass } = env.smtp;
  if (!host || !port || !user || !pass) {
    return null;
  }
  cached = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
  return cached;
}

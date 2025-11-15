import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(1, "Введите имя"),
  email: z.string().email("Укажите корректный email"),
  company: z.string().min(1, "Укажите компанию"),
  headcount: z.string().min(1, "Выберите размер"),
  message: z.string().min(1, "Напишите короткий комментарий"),
  honeypot: z.string().optional(),
  renderedAt: z.number().optional(),
  submittedAt: z.number().optional(),
});

export type ContactFormData = z.infer<typeof contactSchema>;

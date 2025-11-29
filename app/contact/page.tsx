import type { Metadata } from "next";
import ContactForm from "@/components/sections/contact/ContactForm";

export const metadata: Metadata = {
  title: "Quadrant — связаться с командой",
  description: "Оставьте заявку, чтобы обсудить пилот, интеграции и стоимость Quadrant для вашей компании.",
};

const contactTopics = [
  "Пилот Quadrant (3–6 недель)",
  "Интеграции: GitHub/GitLab, Jira, Confluence/Notion, Slack и др.",
  "Стоимость и формат лицензирования",
  "Quadrant для специалистов (личный профиль)",
];

export default function ContactPage() {
  return (
    <div className="bg-gradient-to-b from-brand-muted/40 via-white to-white">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.4em] text-brand-primary/70">Контакты</p>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold text-brand-text">Свяжитесь с командой Quadrant</h1>
              <p className="text-lg text-slate-600">
                Расскажите о вашей команде и задачах — мы предложим формат пилота, стоимость и примерный план интеграции под ваш стек.
              </p>
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <p className="text-sm font-semibold text-brand-text">Что можно обсудить</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                {contactTopics.map((topic) => (
                  <li key={topic} className="flex gap-3">
                    <span className="text-brand-primary">•</span>
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-slate-500">
              Quadrant бесплатен для специалистов. Платит компания за рабочие места и интеграции.
            </p>
          </div>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}

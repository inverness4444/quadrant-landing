import Card from "@/components/common/Card";
import SectionTitle from "@/components/common/SectionTitle";
import ContactForm from "@/components/sections/contact/ContactForm";
import { contentService } from "@/services/contentService";
import type { Metadata } from "next";

const contactData = contentService.getContactContent();

export const metadata: Metadata = {
  title: "Свяжитесь с командой Quadrant",
  description:
    "Заполните форму и получите демо Quadrant. Подскажем, как построить живую карту навыков вашей команды.",
};

export default function ContactPage() {
  const { title, subtitle, steps } = contactData;
  return (
    <div className="space-y-10">
      <SectionTitle eyebrow="Связаться" title={title} subtitle={subtitle} />
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <p className="text-lg font-semibold text-brand-text">
            Что произойдёт дальше
          </p>
          <ol className="mt-4 space-y-3 text-sm text-slate-600">
            {steps.map((step, index) => (
              <li key={step}>
                {index + 1}. {step}
              </li>
            ))}
          </ol>
        </Card>
        <ContactForm />
      </div>
    </div>
  );
}

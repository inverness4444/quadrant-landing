import SectionTitle from "@/components/common/SectionTitle";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quadrant — условия использования",
  description:
    "Основные условия использования Quadrant. Полную версию предоставим по запросу.",
};

export default function TermsPage() {
  return (
    <div className="space-y-6 rounded-3xl border border-brand-border bg-white p-8 shadow-sm">
      <SectionTitle
        eyebrow="Условия"
        title="Пользовательское соглашение (кратко)"
        subtitle="Работаем по договору оферты или индивидуальному контракту. Ниже — ключевые положения."
      />
      <div className="space-y-3 text-sm text-slate-600">
        <p>• Quadrant используется сотрудниками компаний-клиентов по подписке.</p>
        <p>• Данные остаются собственностью клиента. Quadrant — обработчик.</p>
        <p>• Клиент отвечает за корректность доступов и источников данных.</p>
        <p>• SLA и ответственность описываются в отдельном приложении.</p>
        <p>• Вопросы можно задать по адресу hello@quadrant.app.</p>
      </div>
    </div>
  );
}

import SectionTitle from "@/components/common/SectionTitle";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Политика конфиденциальности Quadrant",
  description:
    "Мы бережно относимся к вашим данным: используем шифрование, гибкие доступы и можем размещать Quadrant on-premise.",
};

export default function PrivacyPage() {
  return (
    <div className="space-y-4 rounded-3xl border border-brand-border bg-white p-8 shadow-sm">
      <SectionTitle
        eyebrow="Политика"
        title="Политика конфиденциальности (кратко)"
        subtitle="Полную версию отправим по запросу вместе с договором. Ниже — основные положения."
      />
      <div className="space-y-3 text-sm text-slate-600">
        <p>• Мы храним данные в облаке по вашему выбору или on-premise.</p>
        <p>• Все подключения защищены шифрованием, доступы — через SSO и ролями.</p>
        <p>• Quadrant обрабатывает только артефакты, которые вы явно разрешили.</p>
        <p>• По запросу подписываем NDA и Data Processing Agreement.</p>
      </div>
    </div>
  );
}

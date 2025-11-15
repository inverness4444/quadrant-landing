import SectionTitle from "@/components/common/SectionTitle";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quadrant — вход в личный кабинет",
  description:
    "Доступ к Quadrant предоставляется компаниям по приглашению. Если нужно демо, оставьте заявку на странице контактов.",
};

export default function LoginPage() {
  return (
    <div className="rounded-3xl border border-brand-border bg-white p-8 shadow-sm">
      <SectionTitle
        eyebrow="Личный кабинет"
        title="Вход доступен по приглашению"
        subtitle="Если ваша компания использует Quadrant, обратитесь к администратору за ссылкой. Для демо — перейдите на страницу контактов."
      />
    </div>
  );
}

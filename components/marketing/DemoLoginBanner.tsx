import PrimaryButton from "@/components/common/PrimaryButton";
import Card from "@/components/common/Card";
import { env } from "@/config/env";

export default function DemoLoginBanner({ className }: { className?: string }) {
  if (!env.demo.enabled) {
    return null;
  }
  const email = env.demo.email ?? "demo@quadrant.app";
  const highlights = [
    "Живой граф навыков и сотрудников",
    "Карьерные треки и уровни",
    "Артефакты из GitHub/Jira/Notion",
    "Лимиты планов и биллинг",
  ];
  return (
    <Card className={className ?? ""}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-brand-primary">Демо-режим</p>
          <p className="mt-1 text-base font-semibold text-brand-text">Зайдите в Quadrant без регистрации</p>
          <p className="text-sm text-slate-500">
            Мы подготовили аккаунт с сотрудниками, навыками, артефактами и подключенными интеграциями.
          </p>
          <ul className="mt-2 list-disc pl-5 text-xs text-slate-500">
            {highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-slate-400">Логин: {email}</p>
        </div>
        <PrimaryButton href="/auth/demo-login" className="w-full justify-center md:w-auto">
          Войти как демо-компания
        </PrimaryButton>
      </div>
    </Card>
  );
}

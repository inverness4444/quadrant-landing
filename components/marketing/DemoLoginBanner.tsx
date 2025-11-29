import PrimaryButton from "@/components/common/PrimaryButton";
import Card from "@/components/common/Card";
import { env } from "@/config/env";

type DemoLoginBannerProps = {
  className?: string;
};

export default function DemoLoginBanner({ className }: DemoLoginBannerProps) {
  const enabled = Boolean(env.demo.enabled);
  const email = env.demo.email ?? "demo@quadrant.app";
  const highlights = [
    "Живой граф сотрудников и навыков",
    "Карьерные треки и уровни",
    "Артефакты из GitHub/Jira/Notion",
    "Подключённые интеграции и тариф Growth",
  ];
  const description = enabled
    ? "Демо-аккаунт уже наполнен данными: сотрудники, навыки, треки, артефакты и интеграции."
    : "Запросите пилот, и мы соберём демо на ваших артефактах и планах роста.";

  return (
    <Card className={className ?? ""}>
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary/80">
            {enabled ? "Демо-режим" : "Пилот"}
          </p>
          <h3 className="text-2xl font-semibold text-brand-text">
            {enabled ? "Войдите в Quadrant без регистрации" : "Хотите увидеть Quadrant на своих данных?"}
          </h3>
          <p className="text-sm text-slate-500">{description}</p>
          <div className="grid gap-3 text-xs text-slate-500 sm:grid-cols-2">
            {highlights.map((item) => (
              <div key={item} className="rounded-2xl border border-white/60 bg-brand-muted/60 px-3 py-2">
                {item}
              </div>
            ))}
          </div>
          {enabled && <p className="text-xs text-slate-400">Логин демо: {email}</p>}
        </div>
        <PrimaryButton
          href={enabled ? "/auth/demo-login" : "/contact"}
          className="w-full justify-center md:w-auto"
        >
          {enabled ? "Войти как демо-компания" : "Запросить пилот"}
        </PrimaryButton>
      </div>
    </Card>
  );
}

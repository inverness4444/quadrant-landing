"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";

type OnboardingState = {
  isCompleted: boolean;
  currentStep: string;
  completedSteps: string;
};

type StepKey =
  | "company_info"
  | "roles_skills"
  | "employees"
  | "focus_teams"
  | "pilots"
  | "feedback"
  | "review";

const steps: Array<{ key: StepKey; title: string; description: string }> = [
  { key: "company_info", title: "Компания", description: "Название, размер, регион" },
  { key: "roles_skills", title: "Роли и навыки", description: "Ключевые роли и навыки" },
  { key: "employees", title: "Сотрудники", description: "Добавьте базовый список" },
  { key: "focus_teams", title: "Команды и цели", description: "Определите фокус и цели развития" },
  { key: "pilots", title: "Пилоты", description: "Какие инициативы тестируем" },
  { key: "feedback", title: "Опросы", description: "Pulse/Review для первых команд" },
  { key: "review", title: "Обзор", description: "Проверьте и подтвердите" },
];

type Props = { workspaceName: string };

export default function SetupWizard({ workspaceName }: Props) {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completedSet = useMemo(() => new Set(JSON.parse(state?.completedSteps ?? "[]")), [state]);

  const activeStep = useMemo(() => {
    if (state?.isCompleted) return "review";
    return (state?.currentStep ?? "company_info") as StepKey;
  }, [state]);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/app/onboarding/state", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json?.ok) throw new Error(json?.error?.message ?? "Не удалось загрузить состояние онбординга");
      setState(json.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  const completeStep = async (step: StepKey, goNext = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/app/onboarding/step-completed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, setCurrentStepToNext: goNext }),
      });
      const json = await response.json();
      if (!response.ok || !json?.ok) throw new Error(json?.error?.message ?? "Не удалось сохранить шаг");
      setState(json.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  const completeAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/app/onboarding/complete", { method: "POST" });
      const json = await response.json();
      if (!response.ok || !json?.ok) throw new Error(json?.error?.message ?? "Не удалось завершить настройку");
      setState(json.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = steps.findIndex((s) => s.key === activeStep);
  const progress = Math.round(((stepIndex + (state?.isCompleted ? 1 : 0)) / steps.length) * 100);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Onboarding</p>
        <h1 className="text-3xl font-semibold text-brand-text">Настройка Quadrant для «{workspaceName}»</h1>
        <p className="mt-2 text-sm text-slate-600">
          За 15–30 минут настроим роли, навыки, сотрудников, пилоты и опросы. Можно вернуться к шагам позже.
        </p>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">Прогресс</p>
          <span className="text-sm font-semibold text-brand-text">{progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-brand-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          {steps.map((step) => {
            const done = completedSet.has(step.key);
            const active = step.key === activeStep;
            return (
              <div
                key={step.key}
                className={`rounded-2xl border p-3 text-sm ${
                  done ? "border-emerald-200 bg-emerald-50/60" : active ? "border-brand-primary/60 bg-white" : "border-slate-100 bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Tag className={done ? "bg-emerald-100 text-emerald-800" : active ? "border border-brand-primary text-brand-primary" : "bg-slate-100 text-slate-600"}>
                    {step.title}
                  </Tag>
                </div>
                <p className="mt-2 text-xs text-slate-500">{step.description}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {error && <Card className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>}

      <Card className="space-y-4">
        {renderStep(activeStep, { completeStep, completeAll, loading })}
        <div className="flex items-center justify-between">
          <SecondaryButton
            disabled={loading || stepIndex <= 0}
            onClick={() => void completeStep(steps[Math.max(stepIndex - 1, 0)].key, false)}
            className="px-4 py-2"
          >
            Назад
          </SecondaryButton>
          {activeStep === "review" ? (
            <PrimaryButton onClick={() => void completeAll()} disabled={loading} className="px-4 py-2">
              Завершить настройку
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={() => void completeStep(activeStep, true)} disabled={loading} className="px-4 py-2">
              Сохранить и продолжить
            </PrimaryButton>
          )}
        </div>
      </Card>

      {state?.isCompleted && (
        <Card className="border border-emerald-200 bg-emerald-50 text-sm text-emerald-800">
          Настройка завершена. Перейдите в <Link href="/app/manager" className="font-semibold text-emerald-900 underline">Manager Home</Link> или{" "}
          <Link href="/app/analytics" className="font-semibold text-emerald-900 underline">Analytics</Link>.
        </Card>
      )}
    </div>
  );
}

function renderStep(
  step: StepKey,
  actions: { completeStep: (s: StepKey, goNext?: boolean) => void; completeAll: () => void; loading: boolean },
) {
  void actions;
  switch (step) {
    case "company_info":
      return (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-brand-text">Информация о компании</h2>
          <p className="text-sm text-slate-600">Заполните название, размер и регион, чтобы Quadrant адаптировал рекомендации.</p>
          <p className="text-xs text-slate-500">
            Для MVP данные можно отредактировать позже в Настройках. Этот шаг помечается как завершённый по кнопке ниже.
          </p>
        </div>
      );
    case "roles_skills":
      return (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-brand-text">Роли и ключевые навыки</h2>
          <p className="text-sm text-slate-600">Добавьте 3–7 ролей и ключевые навыки. Используйте раздел «Навыки и роли», чтобы внести данные.</p>
          <SecondaryButton href="/app/skills" className="px-3 py-2 text-sm">Открыть навыки и роли</SecondaryButton>
        </div>
      );
    case "employees":
      return (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-brand-text">Сотрудники</h2>
          <p className="text-sm text-slate-600">Добавьте первых сотрудников вручную или импортом. Достаточно имени и роли.</p>
          <SecondaryButton href="/app/team" className="px-3 py-2 text-sm">Открыть список сотрудников</SecondaryButton>
        </div>
      );
    case "focus_teams":
      return (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-brand-text">Фокусные команды и цели</h2>
          <p className="text-sm text-slate-600">Выберите 1–3 команды, с которых начнём. Добавьте первые цели развития.</p>
          <SecondaryButton href="/app/agenda" className="px-3 py-2 text-sm">Перейти к задачам</SecondaryButton>
        </div>
      );
    case "pilots":
      return (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-brand-text">Пилоты</h2>
          <p className="text-sm text-slate-600">Создайте 1–2 пилотные инициативы и добавьте участников.</p>
          <SecondaryButton href="/app/pilots" className="px-3 py-2 text-sm">Создать пилот</SecondaryButton>
        </div>
      );
    case "feedback":
      return (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-brand-text">Опросы и обратная связь</h2>
          <p className="text-sm text-slate-600">Запустите базовый pulse-опрос для фокусных команд.</p>
          <SecondaryButton href="/app/feedback/surveys" className="px-3 py-2 text-sm">Открыть опросы</SecondaryButton>
        </div>
      );
    case "review":
      return (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-brand-text">Обзор</h2>
          <p className="text-sm text-slate-600">Проверьте, что роли, сотрудники, пилоты и опросы созданы. Нажмите «Завершить настройку».</p>
        </div>
      );
    default:
      return null;
  }
}

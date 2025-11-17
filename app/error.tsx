"use client";

import { useEffect } from "react";
import PrimaryButton from "@/components/common/PrimaryButton";
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("Global error captured", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-muted px-4">
      <div className="space-y-4 rounded-3xl border border-brand-border bg-white p-8 text-center shadow-sm">
        <p className="text-2xl font-semibold text-brand-text">Что-то пошло не так</p>
        <p className="text-sm text-slate-600">Мы уже получили уведомление. Попробуйте обновить страницу.</p>
        <PrimaryButton onClick={reset}>Обновить</PrimaryButton>
      </div>
    </div>
  );
}

"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";

type FormState = {
  email: string;
  password: string;
  name: string;
  companyName: string;
  inviteToken?: string | null;
};

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("inviteToken");
  const inviteEmail = searchParams.get("email") ?? "";
  const workspaceName = searchParams.get("workspaceName");
  const nextPath = searchParams.get("next") || "/app";

  const [formState, setFormState] = useState<FormState>({
    email: inviteEmail,
    password: "",
    name: "",
    companyName: workspaceName ?? "",
    inviteToken,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inviteMode = Boolean(inviteToken);
  const companyLabel = useMemo(() => {
    if (inviteMode && workspaceName) {
      return `Вы присоединяетесь к "${workspaceName}"`;
    }
    return "Компания / Workspace";
  }, [inviteMode, workspaceName]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formState.email,
        password: formState.password,
        name: formState.name,
        companyName: inviteMode ? undefined : formState.companyName,
        inviteToken: inviteToken ?? undefined,
      }),
    });
    setLoading(false);
    if (response.ok) {
      router.push(nextPath);
      return;
    }
    const data = await response.json();
    setError(data.message || "Не удалось создать аккаунт");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-muted px-4">
      <Card className="w-full max-w-md space-y-4">
        <div>
          <p className="text-xs uppercase text-slate-500">Регистрация</p>
          <h1 className="text-2xl font-semibold text-brand-text">
            {inviteMode ? "Подтвердите аккаунт" : "Создать аккаунт Quadrant"}
          </h1>
        </div>
        {inviteMode && (
          <p className="rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-600">
            Приглашение для почты <strong>{inviteEmail}</strong>
          </p>
        )}
        {error && <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="grid gap-1 text-sm">
            Имя
            <input
              className="h-11 rounded-xl border border-brand-border px-4"
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Email
            <input
              className="h-11 rounded-xl border border-brand-border px-4"
              type="email"
              required
              value={formState.email}
              disabled={inviteMode}
              onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Пароль
            <input
              className="h-11 rounded-xl border border-brand-border px-4"
              type="password"
              minLength={6}
              required
              value={formState.password}
              onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
            />
          </label>
          {!inviteMode && (
            <label className="grid gap-1 text-sm">
              {companyLabel}
              <input
                className="h-11 rounded-xl border border-brand-border px-4"
                required
                value={formState.companyName}
                onChange={(event) => setFormState((prev) => ({ ...prev, companyName: event.target.value }))}
              />
            </label>
          )}
          {inviteMode && workspaceName && (
            <p className="text-xs text-slate-500">
              После регистрации вы перейдёте к подтверждению приглашения в <strong>{workspaceName}</strong>.
            </p>
          )}
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "Создаём..." : inviteMode ? "Продолжить" : "Создать аккаунт"}
          </PrimaryButton>
        </form>
        <p className="text-sm text-slate-600">
          Уже есть аккаунт?{" "}
          <Link href={`/auth/login?next=${encodeURIComponent(nextPath)}`} className="text-brand-link">
            Войти
          </Link>
        </p>
      </Card>
    </div>
  );
}

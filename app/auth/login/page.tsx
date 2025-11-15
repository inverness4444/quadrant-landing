"use client";

import { FormEvent, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/app";
  const [formState, setFormState] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formState),
    });
    setLoading(false);
    if (response.ok) {
      router.push(nextPath);
      return;
    }
    const data = await response.json();
    setError(data.message || "Не удалось войти");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-muted px-4">
      <Card className="w-full max-w-md space-y-4">
        <div>
          <p className="text-xs uppercase text-slate-500">Вход</p>
          <h1 className="text-2xl font-semibold text-brand-text">Quadrant — кабинет</h1>
        </div>
        {error && <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="grid gap-1 text-sm">
            Email
            <input
              className="h-11 rounded-xl border border-brand-border px-4"
              type="email"
              required
              value={formState.email}
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
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "Проверяем..." : "Войти"}
          </PrimaryButton>
        </form>
        <p className="text-sm text-slate-600">
          Нет аккаунта? <Link href="/auth/register" className="text-brand-link">Создать</Link>
        </p>
      </Card>
    </div>
  );
}

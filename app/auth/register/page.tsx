"use client";

import { FormEvent, useState } from "react";
import PrimaryButton from "@/components/common/PrimaryButton";
import Card from "@/components/common/Card";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [formState, setFormState] = useState({
    email: "",
    password: "",
    name: "",
    companyName: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formState),
    });
    setLoading(false);
    if (response.ok) {
      router.push("/app");
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
          <h1 className="text-2xl font-semibold text-brand-text">Создать аккаунт Quadrant</h1>
        </div>
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
          <label className="grid gap-1 text-sm">
            Компания / Workspace
            <input
              className="h-11 rounded-xl border border-brand-border px-4"
              required
              value={formState.companyName}
              onChange={(event) => setFormState((prev) => ({ ...prev, companyName: event.target.value }))}
            />
          </label>
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "Создаём..." : "Создать аккаунт"}
          </PrimaryButton>
        </form>
        <p className="text-sm text-slate-600">
          Уже есть аккаунт? <Link href="/auth/login" className="text-brand-link">Войти</Link>
        </p>
      </Card>
    </div>
  );
}

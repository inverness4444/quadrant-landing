"use client";

import { useCallback, useEffect, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";

type IntegrationDto = {
  id: string;
  type: string;
  name: string;
  status: "connected" | "disconnected" | "error";
  config: string | Record<string, unknown> | null;
  lastSyncedAt: string | null;
};

const typeOptions = [
  { value: "github", label: "GitHub" },
  { value: "jira", label: "Jira" },
  { value: "notion", label: "Notion" },
  { value: "linear", label: "Linear" },
  { value: "custom", label: "Custom" },
];

const statusMeta: Record<
  IntegrationDto["status"],
  { label: string; className: string }
> = {
  connected: { label: "Подключена", className: "bg-emerald-100 text-emerald-800" },
  disconnected: { label: "Отключена", className: "bg-slate-100 text-slate-600" },
  error: { label: "Ошибка", className: "bg-red-100 text-red-700" },
};

type FormState = {
  type: string;
  name: string;
  config: string;
};

export default function IntegrationsClient() {
  const [integrations, setIntegrations] = useState<IntegrationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>({ type: "github", name: "", config: "" });
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [configDraft, setConfigDraft] = useState<Record<string, string>>({});

  const loadIntegrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/app/integrations", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Не удалось загрузить интеграции");
      }
      const payload = (await response.json()) as { ok: boolean; integrations: IntegrationDto[] };
      setIntegrations(payload.integrations ?? []);
      const draft: Record<string, string> = {};
      for (const integration of payload.integrations ?? []) {
        draft[integration.id] =
          typeof integration.config === "string"
            ? integration.config
            : JSON.stringify(integration.config ?? {}, null, 2);
      }
      setConfigDraft(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неожиданная ошибка");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIntegrations();
  }, [loadIntegrations]);

  const handleCreateIntegration = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/app/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formState.type,
          name: formState.name,
          config: formState.config ? parseMaybeJSON(formState.config) : undefined,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? "Не удалось добавить интеграцию");
      }
      setFormState({ type: "github", name: "", config: "" });
      await loadIntegrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания интеграции");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateIntegration = async (id: string, data: Record<string, unknown>) => {
    setUpdatingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/app/integrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? "Не удалось обновить интеграцию");
      }
      await loadIntegrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка обновления интеграции");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    await handleUpdateIntegration(integrationId, { status: "disconnected" });
  };

  const handleSaveConfig = async (integrationId: string) => {
    await handleUpdateIntegration(integrationId, {
      config: configDraft[integrationId] ? parseMaybeJSON(configDraft[integrationId]) : "",
    });
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Интеграции</p>
        <h1 className="text-3xl font-semibold text-brand-text">Подключите рабочие инструменты</h1>
        <p className="text-base text-slate-600">
          GitHub, Jira, Notion и кастомные источники — Quadrant соберёт артефакты вашей команды (таски, PR, документы).
        </p>
      </header>

      <Card className="space-y-4">
        <h2 className="text-xl font-semibold text-brand-text">Добавить интеграцию</h2>
        <form className="grid gap-4 md:grid-cols-3" onSubmit={handleCreateIntegration}>
          <label className="text-sm text-brand-text">
            Тип
            <select
              className="mt-1 w-full rounded-2xl border border-brand-border/60 px-3 py-2 text-sm"
              value={formState.type}
              onChange={(event) => setFormState((prev) => ({ ...prev, type: event.target.value }))}
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-brand-text md:col-span-2">
            Имя
            <input
              className="mt-1 w-full rounded-2xl border border-brand-border/60 px-3 py-2 text-sm"
              placeholder="Например: GitHub — backend монорепа"
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>
          <label className="text-sm text-brand-text md:col-span-3">
            Настройки / проект
            <textarea
              className="mt-1 w-full rounded-2xl border border-brand-border/60 px-3 py-2 text-sm"
              rows={3}
              placeholder='{"repo": "github.com/org/project"}'
              value={formState.config}
              onChange={(event) => setFormState((prev) => ({ ...prev, config: event.target.value }))}
            />
          </label>
          <div className="md:col-span-3">
            <PrimaryButton type="submit" disabled={submitting} className="px-5 py-3">
              {submitting ? "Создаём…" : "Добавить интеграцию"}
            </PrimaryButton>
          </div>
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>

      {loading ? (
        <Card className="text-sm text-slate-500">Загружаем интеграции…</Card>
      ) : integrations.length === 0 ? (
        <Card className="text-sm text-slate-500">
          Пока нет подключений. Добавьте интеграцию выше, чтобы Quadrant начал собирать артефакты.
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {integrations.map((integration) => (
            <Card key={integration.id} className="space-y-4 border border-brand-border/70">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-brand-text">{integration.name}</p>
                  <p className="text-xs text-slate-500">Тип: {integration.type}</p>
                </div>
                <Tag className={statusMeta[integration.status].className}>{statusMeta[integration.status].label}</Tag>
              </div>
              <div className="text-xs text-slate-500">
                {integration.lastSyncedAt ? (
                  <p>Последняя синхронизация: {formatDate(integration.lastSyncedAt)}</p>
                ) : (
                  <p>Синхронизация ещё не запускалась</p>
                )}
              </div>
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Конфиг
                <textarea
                  className="mt-2 w-full rounded-2xl border border-brand-border/70 px-3 py-2 text-sm"
                  rows={3}
                  value={configDraft[integration.id] ?? ""}
                  onChange={(event) =>
                    setConfigDraft((prev) => ({
                      ...prev,
                      [integration.id]: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <SecondaryButton
                  onClick={() => void handleSaveConfig(integration.id)}
                  disabled={updatingId === integration.id}
                  className="px-4 py-2"
                >
                  {updatingId === integration.id ? "Сохраняем…" : "Сохранить"}
                </SecondaryButton>
                {integration.status === "connected" ? (
                  <SecondaryButton
                    onClick={() => void handleDisconnect(integration.id)}
                    disabled={updatingId === integration.id}
                    className="px-4 py-2 text-red-600"
                  >
                    Отключить
                  </SecondaryButton>
                ) : (
                  <PrimaryButton
                    onClick={() => void handleUpdateIntegration(integration.id, { status: "connected" })}
                    disabled={updatingId === integration.id}
                    className="px-4 py-2"
                  >
                    {updatingId === integration.id ? "Включаем…" : "Включить"}
                  </PrimaryButton>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function parseMaybeJSON(value: string) {
  if (!value.trim()) {
    return "";
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

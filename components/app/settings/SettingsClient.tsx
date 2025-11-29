"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import type { Workspace, User, Member, MemberRole, Invite } from "@/drizzle/schema";
import { AVAILABLE_INTEGRATIONS, type IntegrationStatus, type IntegrationType } from "@/integrations/types";
import { buildCsrfHeader } from "@/lib/csrf";

export type SettingsTab = "general" | "security" | "integrations" | "billing";

type MemberListItem = {
  userId: string;
  role: MemberRole;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
};

type ParticipantInvite = {
  id: string;
  email: string;
  role: MemberRole;
  status: Invite["status"];
  createdAt: string;
};

type InviteRole = "member" | "admin";

type IntegrationState = {
  id: string;
  status: IntegrationStatus;
  lastSyncedAt: string | null;
  config: Record<string, unknown>;
};

const EMPTY_INTEGRATIONS_STATE = AVAILABLE_INTEGRATIONS.reduce(
  (acc, integration) => {
    acc[integration.type] = null;
    return acc;
  },
  {} as Record<IntegrationType, IntegrationState | null>,
);

type IntegrationAction =
  | {
      type: IntegrationType;
      action: "connect" | "disconnect" | "sync";
    }
  | null;

type IntegrationActionType = Exclude<IntegrationAction, null>["action"];

type BillingPlanInfo = {
  id: string;
  code: string;
  name: string;
  description: string;
  maxMembers: number | null;
  maxEmployees: number | null;
  maxIntegrations: number | null;
  pricePerMonth: number;
};

type BillingUsage = {
  currentMembersCount: number;
  currentEmployeesCount: number;
  currentIntegrationsCount: number;
  currentArtifactsCount: number;
};

type BillingInfoResponse = {
  plan: BillingPlanInfo;
  workspace: {
    billingEmail: string | null;
    trialEndsAt: string | null;
  };
  usage: BillingUsage;
  plans: BillingPlanInfo[];
};

type SettingsClientProps = {
  workspace: Workspace;
  user: User;
  member: Member;
  initialTab?: SettingsTab;
};

const sizeOptions = [
  { value: "lt20", label: "до 20" },
  { value: "20-100", label: "20–100" },
  { value: "100-500", label: "100–500" },
  { value: "500+", label: "500+" },
] as const;

const inviteStatusLabels: Record<ParticipantInvite["status"], string> = {
  pending: "в ожидании",
  accepted: "принято",
  expired: "отменено",
};

export default function SettingsClient({ workspace, user, member, initialTab = "general" }: SettingsClientProps) {
  const canManageParticipants = member.role !== "member";
  const canManageIntegrations = member.role !== "member";
  const canManageBilling = member.role !== "member";
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [companyForm, setCompanyForm] = useState({
    name: workspace.name,
    size: workspace.size ?? "20-100",
  });
  const [profileForm, setProfileForm] = useState({
    name: user.name ?? "",
    email: user.email,
  });
  const [companyMessage, setCompanyMessage] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [companyPending, startCompanyTransition] = useTransition();
  const [profilePending, startProfileTransition] = useTransition();
  const [membersList, setMembersList] = useState<MemberListItem[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [invites, setInvites] = useState<ParticipantInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [participantsMessage, setParticipantsMessage] = useState<string | null>(null);
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "member" as InviteRole });
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [invitePending, startInviteTransition] = useTransition();
  const [integrationsData, setIntegrationsData] = useState<Record<IntegrationType, IntegrationState | null>>(
    () => ({ ...EMPTY_INTEGRATIONS_STATE }),
  );
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [integrationMessage, setIntegrationMessage] = useState<string | null>(null);
  const [integrationAction, setIntegrationAction] = useState<IntegrationAction>(null);
  const [billingInfo, setBillingInfo] = useState<BillingInfoResponse | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [billingEmail, setBillingEmail] = useState(workspace.billingEmail ?? user.email);
  const [billingSaving, setBillingSaving] = useState(false);

  type ApiErrorResponse = {
    error?: { code?: string; message?: string };
    message?: string;
  };

  const describeApiError = (payload: unknown, fallback: string) => {
    if (payload && typeof payload === "object") {
      const data = payload as ApiErrorResponse;
      if (data.error?.code === "PLAN_LIMIT_REACHED" && data.error.message) {
        return `${data.error.message} Откройте вкладку «Тариф и биллинг», чтобы обновить лимиты.`;
      }
      return data.error?.message || data.message || fallback;
    }
    return fallback;
  };

  const scrollToInviteForm = () => {
    const el = document.getElementById("invite-form");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const tabs = useMemo(() => {
    const list: Array<{ id: SettingsTab; label: string }> = [{ id: "general", label: "Общие" }];
    if (canManageParticipants) {
      list.push({ id: "security", label: "Безопасность" });
    }
    if (canManageIntegrations) {
      list.push({ id: "integrations", label: "Интеграции" });
    }
    if (canManageBilling) {
      list.push({ id: "billing", label: "Тариф и биллинг" });
    }
    return list;
  }, [canManageBilling, canManageIntegrations, canManageParticipants]);

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0]?.id ?? "general");
    }
  }, [activeTab, tabs]);

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const response = await fetch("/api/members");
      if (response.ok) {
        const payload = await response.json();
        setMembersList(
          (payload.members ?? []).map((item: MemberListItem) => ({
            userId: item.userId,
            role: item.role,
            user: {
              id: item.user.id,
              name: item.user.name,
              email: item.user.email,
            },
          })),
        );
      }
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const fetchInvites = useCallback(async () => {
    setInvitesLoading(true);
    try {
      const response = await fetch("/api/invites");
      if (response.ok) {
        const payload = await response.json();
        setInvites(
          (payload.invites ?? []).map((invite: ParticipantInvite) => ({
            id: invite.id,
            email: invite.email,
            role: invite.role,
            status: invite.status,
            createdAt: invite.createdAt,
          })),
        );
      }
    } finally {
      setInvitesLoading(false);
    }
  }, []);

  const fetchIntegrations = useCallback(async () => {
    if (!canManageIntegrations) return;
    setIntegrationsLoading(true);
    try {
      const response = await fetch("/api/integrations");
      if (response.ok) {
        const payload = await response.json();
        const map: Record<IntegrationType, IntegrationState | null> = {} as Record<
          IntegrationType,
          IntegrationState | null
        >;
        (payload.integrations ?? []).forEach(
          (item: { type: IntegrationType; integration: IntegrationState | null }) => {
            map[item.type] = item.integration;
          },
        );
        setIntegrationsData(map);
      }
    } finally {
      setIntegrationsLoading(false);
    }
  }, [canManageIntegrations]);

  const fetchBilling = useCallback(async () => {
    if (!canManageBilling) return;
    setBillingLoading(true);
    try {
      const response = await fetch("/api/app/settings/billing");
      if (response.ok) {
        const payload = await response.json();
        setBillingInfo(payload);
        setBillingEmail(payload.workspace?.billingEmail ?? user.email);
      }
    } finally {
      setBillingLoading(false);
    }
  }, [canManageBilling, user.email]);

  useEffect(() => {
    if (!canManageParticipants) return;
    void fetchMembers();
    void fetchInvites();
  }, [canManageParticipants, fetchInvites, fetchMembers]);

  useEffect(() => {
    if (!canManageIntegrations) return;
    void fetchIntegrations();
  }, [canManageIntegrations, fetchIntegrations]);

  useEffect(() => {
    if (!canManageBilling) return;
    void fetchBilling();
  }, [canManageBilling, fetchBilling]);

  const handleCompanySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCompanyMessage(null);
    startCompanyTransition(async () => {
      const response = await fetch("/api/app/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...buildCsrfHeader() },
        body: JSON.stringify(companyForm),
      });
      if (response.ok) {
        setCompanyMessage("Сохранено");
      } else {
        setCompanyMessage("Ошибка сохранения");
      }
    });
  };

  const handleProfileSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage(null);
    startProfileTransition(async () => {
      const response = await fetch("/api/app/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...buildCsrfHeader() },
        body: JSON.stringify({ name: profileForm.name }),
      });
      if (response.ok) {
        setProfileMessage("Сохранено");
      } else {
        setProfileMessage("Ошибка сохранения");
      }
    });
  };

  const handleBillingSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBillingMessage(null);
    setBillingSaving(true);
    (async () => {
      const response = await fetch("/api/app/settings/billing", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...buildCsrfHeader() },
        body: JSON.stringify({ billingEmail }),
      });
      setBillingSaving(false);
      if (response.ok) {
        setBillingMessage("Сохранено");
        await fetchBilling();
      } else {
        const data = await response.json().catch(() => ({}));
        setBillingMessage(data.message || "Не удалось сохранить email для биллинга");
      }
    })();
  };

  const handleInviteSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInviteMessage(null);
    startInviteTransition(async () => {
      const response = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...buildCsrfHeader() },
        body: JSON.stringify(inviteForm),
      });
      if (response.ok) {
        setInviteMessage("Приглашение отправлено");
        setInviteForm({ email: "", role: "member" });
        await fetchInvites();
      } else {
        const data = await response.json().catch(() => ({}));
        setInviteMessage(describeApiError(data, "Не удалось отправить приглашение"));
      }
    });
  };

  const sendIntegrationRequest = async (
    endpoint: string,
    payload: Record<string, unknown>,
    action: IntegrationActionType,
    type: IntegrationType,
  ) => {
    setIntegrationAction({ type, action });
    setIntegrationMessage(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...buildCsrfHeader() },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setIntegrationMessage(describeApiError(data, "Не удалось выполнить действие"));
        return null;
      }
      await fetchIntegrations();
      return response;
    } finally {
      setIntegrationAction(null);
    }
  };

  const handleConnectIntegration = async (type: IntegrationType) => {
    const response = await sendIntegrationRequest("/api/integrations/connect", { type }, "connect", type);
    if (response) {
      setIntegrationMessage("Интеграция подключена");
    }
  };

  const handleDisconnectIntegration = async (type: IntegrationType) => {
    const response = await sendIntegrationRequest(
      "/api/integrations/disconnect",
      { type },
      "disconnect",
      type,
    );
    if (response) {
      setIntegrationMessage("Интеграция отключена");
    }
  };

  const handleSyncIntegration = async (type: IntegrationType) => {
    const response = await sendIntegrationRequest("/api/integrations/sync", { type }, "sync", type);
    if (response) {
      const data = await response.json().catch(() => ({}));
      const count = typeof data.createdArtifactsCount === "number" ? data.createdArtifactsCount : 0;
      setIntegrationMessage(`Синхронизация завершена. Создано ${count} артефактов.`);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    setParticipantsMessage(null);
    const response = await fetch(`/api/invites/${inviteId}`, {
      method: "DELETE",
      headers: buildCsrfHeader(),
    });
    if (response.ok) {
      setParticipantsMessage("Приглашение отменено");
      await fetchInvites();
    } else {
      const data = await response.json().catch(() => ({}));
      setParticipantsMessage(data.message || "Не удалось отменить приглашение");
    }
  };

  const handleRoleChange = async (userId: string, role: MemberRole) => {
    setParticipantsMessage(null);
    setRoleUpdating(userId);
    try {
      const response = await fetch(`/api/members/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...buildCsrfHeader() },
        body: JSON.stringify({ role }),
      });
      if (response.ok) {
        setParticipantsMessage("Роль обновлена");
        await fetchMembers();
      } else {
        setParticipantsMessage("Не удалось обновить роль");
      }
    } finally {
      setRoleUpdating(null);
    }
  };

  const integrationStatusLabels: Record<IntegrationStatus, string> = {
    connected: "Подключено",
    disconnected: "Отключено",
    error: "Ошибка",
  };

  const isIntegrationActionPending = (type: IntegrationType, action: IntegrationActionType) =>
    integrationAction?.type === type && integrationAction?.action === action;

  const formatUsageValue = (current: number, max: number | null | undefined) => {
    if (!max || max <= 0) {
      return `${current} / ∞`;
    }
    return `${current} / ${max}`;
  };

  const formatPriceLabel = (value: number) => {
    if (!value) return "Бесплатно";
    return `от ${value} $/мес`;
  };

  const hasConnectedIntegrations = Object.values(integrationsData).some(
    (integration) => integration?.status === "connected",
  );
  const defaultIntegrationType = AVAILABLE_INTEGRATIONS[0]?.type ?? "github";

  const renderParticipants = () => (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-text">Команда и доступ</p>
            <p className="text-xs text-slate-500">Кто может видеть данные рабочей области</p>
          </div>
          <p className="text-xs uppercase text-slate-400">{membersList.length} участников</p>
        </div>
        {participantsMessage && <p className="mt-3 text-sm text-slate-500">{participantsMessage}</p>}
        <div className="mt-4 overflow-x-auto">
          {membersLoading ? (
            <p className="text-sm text-slate-500">Загрузка участников...</p>
          ) : membersList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-brand-border p-6 text-center">
              <p className="text-sm text-slate-600">Вы пока единственный участник. Пригласите коллег ниже.</p>
              <PrimaryButton type="button" className="mt-4 px-4 py-2" onClick={scrollToInviteForm}>
                Пригласить участника
              </PrimaryButton>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="pb-2">Имя</th>
                  <th className="pb-2 text-left">Email</th>
                  <th className="pb-2 text-left">Роль</th>
                </tr>
              </thead>
              <tbody>
                {membersList.map((item) => (
                  <tr key={item.userId} className="border-t border-brand-border/60">
                    <td className="py-3">
                      <p className="font-medium text-brand-text">
                        {item.user.name || item.user.email}
                      </p>
                    </td>
                    <td className="py-3 text-slate-600">{item.user.email}</td>
                    <td className="py-3">
                      {item.role === "owner" ? (
                        <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                          Владелец
                        </span>
                      ) : (
                        <select
                          className="h-9 rounded-xl border border-brand-border/60 bg-white px-3 text-sm"
                          value={item.role}
                          onChange={(event) => handleRoleChange(item.userId, event.target.value as MemberRole)}
                          disabled={roleUpdating === item.userId}
                        >
                          <option value="member">Участник</option>
                          <option value="admin">Админ</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-text">Приглашения</p>
            <p className="text-xs text-slate-500">Отправленные инвайты</p>
          </div>
          <p className="text-xs uppercase text-slate-400">{invites.length} писем</p>
        </div>
        <div className="mt-3 overflow-x-auto">
          {invitesLoading ? (
            <p className="text-sm text-slate-500">Загрузка приглашений...</p>
          ) : invites.length === 0 ? (
            <p className="text-sm text-slate-500">Пока нет активных приглашений — используйте форму ниже, чтобы отправить первое.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="pb-2">Email</th>
                  <th className="pb-2 text-left">Роль</th>
                  <th className="pb-2 text-left">Статус</th>
                  <th className="pb-2 text-left">Дата</th>
                  <th className="pb-2 text-left">Действие</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.id} className="border-t border-brand-border/60">
                    <td className="py-3 text-slate-700">{invite.email}</td>
                    <td className="py-3 text-slate-600">{invite.role === "admin" ? "Админ" : "Участник"}</td>
                    <td className="py-3 text-slate-600">{inviteStatusLabels[invite.status]}</td>
                    <td className="py-3 text-slate-600">{new Date(invite.createdAt).toLocaleString("ru-RU")}</td>
                    <td className="py-3">
                      {invite.status === "pending" && (
                        <button
                          className="text-xs font-semibold text-brand-primary"
                          onClick={() => handleCancelInvite(invite.id)}
                          type="button"
                        >
                          Отменить
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
      <Card>
        <p className="text-sm font-semibold text-brand-text">Пригласить участника</p>
        <p className="text-xs text-slate-500">Отправьте приглашение по email</p>
        <form id="invite-form" className="mt-4 space-y-3" onSubmit={handleInviteSubmit}>
          <label className="block text-sm text-slate-600">
            Email
            <input
              className="mt-1 h-11 w-full rounded-xl border border-brand-border px-4"
              value={inviteForm.email}
              onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
          </label>
          <label className="block text-sm text-slate-600">
            Роль
            <select
              className="mt-1 h-11 w-full rounded-xl border border-brand-border px-4"
              value={inviteForm.role}
              onChange={(event) => setInviteForm((prev) => ({ ...prev, role: event.target.value as InviteRole }))}
            >
              <option value="member">Участник</option>
              <option value="admin">Админ</option>
            </select>
          </label>
          <div className="flex items-center gap-3">
            <PrimaryButton type="submit" disabled={invitePending} className="px-4 py-2">
              {invitePending ? "Отправляем..." : "Отправить приглашение"}
            </PrimaryButton>
            {inviteMessage && <span className="text-sm text-slate-500">{inviteMessage}</span>}
          </div>
        </form>
      </Card>
      <Card className="border border-dashed border-brand-border bg-brand-muted/40">
        <p className="text-sm font-semibold text-brand-text">Скоро: расширенные политики</p>
        <p className="text-sm text-slate-600">
          SSO, SCIM и автоматическое управление доступом сейчас в разработке. Сообщите нам, если вам нужны приоритетные интеграции.
        </p>
      </Card>
    </div>
  );

  const renderIntegrations = () => (
    <div className="space-y-4">
      {integrationMessage && <p className="text-sm text-slate-500">{integrationMessage}</p>}
      {integrationsLoading ? (
        <p className="text-sm text-slate-500">Загружаем интеграции...</p>
      ) : (
        <>
          {!hasConnectedIntegrations && (
            <Card className="border-dashed">
              <p className="text-sm text-slate-600">
                Подключите GitHub, Jira или Notion, чтобы Quadrant подтягивал реальные артефакты и показывал вклад команд.
              </p>
              {canManageIntegrations && (
                <PrimaryButton
                  type="button"
                  className="mt-3 px-4 py-2"
                  onClick={() => handleConnectIntegration(defaultIntegrationType)}
                  disabled={isIntegrationActionPending(defaultIntegrationType, "connect")}
                >
                  Подключить интеграцию
                </PrimaryButton>
              )}
            </Card>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            {AVAILABLE_INTEGRATIONS.map((descriptor) => {
              const data = integrationsData[descriptor.type] ?? null;
              const statusLabel = data ? integrationStatusLabels[data.status] : "Не подключено";
              return (
                <Card
                  key={descriptor.type}
                  className="space-y-3"
                  data-testid={`integration-card-${descriptor.type}`}
                >
                <div>
                  <p className="text-sm font-semibold text-brand-text">{descriptor.displayName}</p>
                  <p className="text-xs text-slate-500">{descriptor.description}</p>
                </div>
                <p className="text-sm text-slate-600">
                  Статус: <span className="font-semibold">{statusLabel}</span>
                </p>
                {data?.lastSyncedAt && (
                  <p className="text-xs text-slate-500">
                    Последняя синхронизация: {new Date(data.lastSyncedAt).toLocaleString("ru-RU")}
                  </p>
                )}
                {canManageIntegrations && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(!data || data.status !== "connected") && (
                      <PrimaryButton
                        type="button"
                        className="px-4 py-2"
                        onClick={() => handleConnectIntegration(descriptor.type)}
                        disabled={isIntegrationActionPending(descriptor.type, "connect")}
                      >
                        {isIntegrationActionPending(descriptor.type, "connect") ? "Подключаем..." : "Подключить"}
                      </PrimaryButton>
                    )}
                    {data && data.status === "connected" && (
                      <>
                        <SecondaryButton
                          type="button"
                          className="px-4 py-2"
                          onClick={() => handleDisconnectIntegration(descriptor.type)}
                          disabled={isIntegrationActionPending(descriptor.type, "disconnect")}
                        >
                          {isIntegrationActionPending(descriptor.type, "disconnect") ? "Отключаем..." : "Отключить"}
                        </SecondaryButton>
                        <PrimaryButton
                          type="button"
                          className="px-4 py-2"
                          onClick={() => handleSyncIntegration(descriptor.type)}
                          disabled={isIntegrationActionPending(descriptor.type, "sync")}
                        >
                          {isIntegrationActionPending(descriptor.type, "sync")
                            ? "Синхронизируем..."
                            : "Синхронизировать"}
                        </PrimaryButton>
                      </>
                    )}
                  </div>
                )}
              </Card>
            );
            })}
          </div>
        </>
      )}
    </div>
  );

  const renderBilling = () => {
    const usage = billingInfo?.usage;
    const plan = billingInfo?.plan;
    const trialEndsAt = billingInfo?.workspace.trialEndsAt;
    const trialActive = trialEndsAt ? new Date(trialEndsAt) > new Date() : false;
    const availablePlans = billingInfo?.plans ?? [];

    return (
      <div className="space-y-6">
        <Card>
          {billingLoading && !plan ? (
            <p className="text-sm text-slate-500">Загружаем данные тарифа...</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-brand-text">Текущий план</p>
              <p className="text-xl font-semibold text-brand-text">{plan?.name ?? "—"}</p>
              <p className="mt-1 text-sm text-slate-600">{plan?.description}</p>
              {trialActive && trialEndsAt && (
                <p className="mt-2 text-xs font-semibold text-emerald-600">
                  Пробный период до {new Date(trialEndsAt).toLocaleDateString("ru-RU")}
                </p>
              )}
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Сотрудники</span>
                  <span className="font-semibold">
                    {formatUsageValue(usage?.currentEmployeesCount ?? 0, plan?.maxEmployees ?? null)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Участники</span>
                  <span className="font-semibold">
                    {formatUsageValue(usage?.currentMembersCount ?? 0, plan?.maxMembers ?? null)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Интеграции</span>
                  <span className="font-semibold">
                    {formatUsageValue(usage?.currentIntegrationsCount ?? 0, plan?.maxIntegrations ?? null)}
                  </span>
                </div>
              </div>
            </>
          )}
        </Card>
        <Card>
          <p className="text-sm font-semibold text-brand-text">Email для счетов</p>
          <p className="text-xs text-slate-500">Quadrant будет отправлять счета и напоминания на этот адрес.</p>
          <form className="mt-3 flex flex-col gap-3 sm:flex-row" onSubmit={handleBillingSubmit}>
            <input
              className="h-11 flex-1 rounded-xl border border-brand-border px-4"
              value={billingEmail}
              onChange={(event) => setBillingEmail(event.target.value)}
              type="email"
              required
            />
            <PrimaryButton type="submit" disabled={billingSaving} className="px-6">
              {billingSaving ? "Сохраняем..." : "Сохранить"}
            </PrimaryButton>
          </form>
          {billingMessage && <p className="mt-2 text-sm text-slate-500">{billingMessage}</p>}
        </Card>
        <div className="grid gap-4 md:grid-cols-3">
          {availablePlans.map((planOption) => (
            <Card
              key={planOption.id}
              className={`space-y-3 ${planOption.id === plan?.id ? "border-brand-primary" : ""}`}
            >
              <p className="text-sm font-semibold uppercase text-slate-500">{planOption.name}</p>
              <p className="text-xl font-semibold text-brand-text">{formatPriceLabel(planOption.pricePerMonth)}</p>
              <p className="text-sm text-slate-600">{planOption.description}</p>
              <div className="text-xs text-slate-500">
                <p>Участники: {planOption.maxMembers ? `до ${planOption.maxMembers}` : "без лимита"}</p>
                <p>Сотрудники: {planOption.maxEmployees ? `до ${planOption.maxEmployees}` : "без лимита"}</p>
                <p>Интеграции: {planOption.maxIntegrations ? `до ${planOption.maxIntegrations}` : "без лимита"}</p>
              </div>
              <PrimaryButton
                href={planOption.pricePerMonth ? `/contact?plan=${planOption.code}` : "/auth/register"}
                variant={planOption.pricePerMonth ? "secondary" : "primary"}
                className="w-full"
              >
                {planOption.pricePerMonth ? `Обсудить ${planOption.name}` : "Начать бесплатно"}
              </PrimaryButton>
            </Card>
          ))}
        </div>
      </div>
    );
  };
  const renderTabContent = () => {
    if (activeTab === "general") {
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <form className="space-y-4" onSubmit={handleCompanySubmit}>
              <div>
                <p className="text-sm font-semibold text-brand-text">Рабочая область</p>
                <p className="text-xs text-slate-500">
                  Название компании, чтобы участники понимали, куда попали.
                </p>
              </div>
              <label className="text-sm text-slate-600">
                Название
                <input
                  className="mt-1 h-11 w-full rounded-xl border border-brand-border px-4"
                  value={companyForm.name}
                  onChange={(event) =>
                    setCompanyForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="text-sm text-slate-600">
                Размер компании
                <select
                  className="mt-1 h-11 w-full rounded-xl border border-brand-border px-4"
                  value={companyForm.size}
                  onChange={(event) =>
                    setCompanyForm((prev) => ({ ...prev, size: event.target.value }))
                  }
                >
                  {sizeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-3">
                <PrimaryButton type="submit" disabled={companyPending} className="px-4 py-2">
                  {companyPending ? "Сохраняем..." : "Сохранить"}
                </PrimaryButton>
                {companyMessage && <span className="text-sm text-slate-500">{companyMessage}</span>}
              </div>
            </form>
          </Card>
          <Card>
            <form className="space-y-4" onSubmit={handleProfileSubmit}>
              <div>
                <p className="text-sm font-semibold text-brand-text">Профиль администратора</p>
                <p className="text-xs text-slate-500">Эти данные видят участники в приглашениях и письмах.</p>
              </div>
              <label className="text-sm text-slate-600">
                Имя
                <input
                  className="mt-1 h-11 w-full rounded-xl border border-brand-border px-4"
                  value={profileForm.name}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="text-sm text-slate-600">
                Email
                <input
                  className="mt-1 h-11 w-full rounded-xl border border-brand-border bg-brand-muted/60 px-4"
                  value={profileForm.email}
                  disabled
                />
              </label>
              <div className="flex items-center gap-3">
                <PrimaryButton type="submit" disabled={profilePending} className="px-4 py-2">
                  {profilePending ? "Сохраняем..." : "Сохранить"}
                </PrimaryButton>
                {profileMessage && <span className="text-sm text-slate-500">{profileMessage}</span>}
              </div>
            </form>
          </Card>
        </div>
      );
    }
    if (activeTab === "security") {
      return renderParticipants();
    }
    if (activeTab === "integrations") {
      return renderIntegrations();
    }
    if (activeTab === "billing") {
      return renderBilling();
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-text">Настройки рабочей области</h1>
        <p className="text-sm text-slate-600">
          Управляйте общими данными, доступом команды, интеграциями и биллингом — всё в одном месте.
        </p>
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 border-b border-brand-border pb-4">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-brand-primary text-white"
                  : "border border-brand-border text-slate-600"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {renderTabContent()}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import type { Workspace, User, Member, MemberRole, Invite } from "@/drizzle/schema";

type SettingsTab = "company" | "profile" | "participants";

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

type SettingsClientProps = {
  workspace: Workspace;
  user: User;
  member: Member;
};

const sizeOptions = [
  { value: "lt20", label: "до 20" },
  { value: "20-100", label: "20–100" },
  { value: "100-500", label: "100–500" },
  { value: "500+", label: "500+" },
] as const;

export default function SettingsClient({ workspace, user, member }: SettingsClientProps) {
  const canManageParticipants = member.role !== "member";
  const [activeTab, setActiveTab] = useState<SettingsTab>("company");
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

  const tabs = [
    { id: "company", label: "Компания" },
    { id: "profile", label: "Профиль" },
    ...(canManageParticipants ? [{ id: "participants", label: "Участники" }] : []),
  ] as const;

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

  useEffect(() => {
    if (!canManageParticipants) return;
    void fetchMembers();
    void fetchInvites();
  }, [canManageParticipants, fetchInvites, fetchMembers]);

  const handleCompanySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCompanyMessage(null);
    startCompanyTransition(async () => {
      const response = await fetch("/api/app/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileForm.name }),
      });
      if (response.ok) {
        setProfileMessage("Сохранено");
      } else {
        setProfileMessage("Ошибка сохранения");
      }
    });
  };

  const handleInviteSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInviteMessage(null);
    startInviteTransition(async () => {
      const response = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      if (response.ok) {
        setInviteMessage("Приглашение отправлено");
        setInviteForm({ email: "", role: "member" });
        await fetchInvites();
      } else {
        setInviteMessage("Не удалось отправить приглашение");
      }
    });
  };

  const handleCancelInvite = async (inviteId: string) => {
    setParticipantsMessage(null);
    const response = await fetch(`/api/invites/${inviteId}`, { method: "DELETE" });
    if (response.ok) {
      setParticipantsMessage("Приглашение отменено");
      await fetchInvites();
    } else {
      setParticipantsMessage("Не удалось отменить приглашение");
    }
  };

  const handleRoleChange = async (userId: string, role: MemberRole) => {
    setParticipantsMessage(null);
    setRoleUpdating(userId);
    const response = await fetch(`/api/members/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setRoleUpdating(null);
    if (response.ok) {
      setParticipantsMessage("Роль обновлена");
      await fetchMembers();
    } else {
      setParticipantsMessage("Не удалось обновить роль");
    }
  };

  const renderParticipants = () => (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-text">Участники</p>
            <p className="text-xs text-slate-500">Управление доступом к workspace</p>
          </div>
          <p className="text-xs uppercase text-slate-400">{membersList.length} участников</p>
        </div>
        {participantsMessage && <p className="mt-3 text-sm text-slate-500">{participantsMessage}</p>}
        <div className="mt-4 overflow-x-auto">
          {membersLoading ? (
            <p className="text-sm text-slate-500">Загрузка участников...</p>
          ) : membersList.length === 0 ? (
            <p className="text-sm text-slate-500">Нет участников</p>
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
                          disabled={Boolean(roleUpdating)}
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
            <p className="text-sm text-slate-500">Пока нет активных приглашений</p>
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
                    <td className="py-3 text-slate-600">{invite.status}</td>
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
        <form className="mt-4 space-y-3" onSubmit={handleInviteSubmit}>
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
    </div>
  );

  const renderTabContent = () => {
    if (activeTab === "company") {
      return (
        <Card>
          <form className="space-y-4" onSubmit={handleCompanySubmit}>
            <div>
              <p className="text-sm font-semibold text-brand-text">Компания</p>
              <p className="text-xs text-slate-500">Название и размер workspace</p>
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
      );
    }
    if (activeTab === "profile") {
      return (
        <Card>
          <form className="space-y-4" onSubmit={handleProfileSubmit}>
            <div>
              <p className="text-sm font-semibold text-brand-text">Профиль</p>
              <p className="text-xs text-slate-500">Данные владельца workspace</p>
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
      );
    }
    if (activeTab === "participants") {
      return renderParticipants();
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-text">Настройки</h1>
        <p className="text-sm text-slate-600">Обновите данные компании и профиля</p>
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

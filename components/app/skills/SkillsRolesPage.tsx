"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import RoleProfileDialog from "@/components/app/skills/RoleProfileDialog";
import Tag from "@/components/common/Tag";

type RoleProfile = {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  updatedAt?: string;
  requirements: Array<{
    id: string;
    skillCode: string;
    levelRequired: number;
    weight: number;
  }>;
};

type EmployeeRow = {
  id: string;
  name: string;
  primaryRoleName?: string | null;
};

type SkillsRolesPageProps = {
  canEdit: boolean;
};

export default function SkillsRolesPage({ canEdit }: SkillsRolesPageProps) {
  const [roles, setRoles] = useState<RoleProfile[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleProfile | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRow | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadRoles();
    void loadEmployees();
  }, []);

  async function loadRoles() {
    setLoadingRoles(true);
    setError(null);
    try {
      const response = await fetch("/api/app/skill-gap/role-profiles", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; profiles?: RoleProfile[]; error?: { message?: string } } | null;
      if (!response.ok || !payload?.ok || !payload.profiles) {
        throw new Error(payload?.error?.message ?? "Не удалось загрузить профили ролей");
      }
      setRoles(payload.profiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки ролей");
    } finally {
      setLoadingRoles(false);
    }
  }

  async function loadEmployees() {
    setLoadingEmployees(true);
    try {
      const response = await fetch("/api/app/employees", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; employees?: Array<{ id: string; name: string; primaryRoleName?: string | null }> };
      if (response.ok && payload?.employees) {
        setEmployees(payload.employees.map((e) => ({ id: e.id, name: e.name, primaryRoleName: e.primaryRoleName ?? null })));
      }
    } finally {
      setLoadingEmployees(false);
    }
  }

  const rolesSummary = useMemo(
    () =>
      roles.map((role) => ({
        ...role,
        skillsCount: role.requirements.length,
      })),
    [roles],
  );

  const startCreate = () => {
    setEditingRole(null);
    setDialogOpen(true);
  };

  const startEdit = (role: RoleProfile) => {
    setEditingRole(role);
    setDialogOpen(true);
  };

  const assignRole = async () => {
    if (!selectedEmployee || !selectedRoleId) return;
    setAssigning(true);
    setStatusMessage(null);
    try {
      const response = await fetch("/api/app/skill-gap/assign-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          roleProfileId: selectedRoleId,
          isPrimary: true,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: { message?: string } };
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось назначить роль");
      }
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === selectedEmployee.id ? { ...emp, primaryRoleName: roles.find((r) => r.id === selectedRoleId)?.name ?? "Роль" } : emp)),
      );
      setStatusMessage("Роль обновлена");
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Ошибка назначения роли");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Навыки и роли</p>
          <h1 className="text-3xl font-semibold text-brand-text">Профили ролей</h1>
          <p className="text-sm text-slate-600">Что люди должны уметь на ключевых ролях.</p>
        </div>
        {canEdit && (
          <PrimaryButton onClick={startCreate} className="px-4 py-2">
            Создать профиль роли
          </PrimaryButton>
        )}
      </div>

      {error && <Card className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Список ролей</p>
              <h2 className="text-xl font-semibold text-brand-text">Профили</h2>
            </div>
            <SecondaryButton onClick={() => void loadRoles()} className="px-3 py-1 text-xs" disabled={loadingRoles}>
              Обновить
            </SecondaryButton>
          </div>
          {loadingRoles ? (
            <p className="text-sm text-slate-500">Загружаем профили…</p>
          ) : rolesSummary.length === 0 ? (
            <p className="text-sm text-slate-500">Профили ролей пока не созданы.</p>
          ) : (
            <div className="grid gap-2">
              {rolesSummary.map((role) => (
                <div key={role.id} className="rounded-2xl border border-white/60 bg-white/90 p-3 text-sm text-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-brand-text">{role.name}</p>
                      {role.description && <p className="text-xs text-slate-500">{role.description}</p>}
                      <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                        <Tag variant="outline">Навыков: {role.skillsCount}</Tag>
                        {role.isDefault && <Tag variant="outline">Шаблон</Tag>}
                        <Tag variant="outline">ID: {role.id.slice(0, 8)}</Tag>
                      </div>
                    </div>
                    {canEdit && (
                      <PrimaryButton onClick={() => startEdit(role)} className="px-3 py-1 text-xs">
                        Редактировать
                      </PrimaryButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Назначения ролей</p>
              <h2 className="text-xl font-semibold text-brand-text">Сотрудники</h2>
            </div>
            <SecondaryButton onClick={() => void loadEmployees()} className="px-3 py-1 text-xs" disabled={loadingEmployees}>
              Обновить
            </SecondaryButton>
          </div>
          {loadingEmployees ? (
            <p className="text-sm text-slate-500">Загружаем сотрудников…</p>
          ) : employees.length === 0 ? (
            <p className="text-sm text-slate-500">Сотрудники не найдены.</p>
          ) : (
            <div className="space-y-2">
              {employees.map((emp) => {
                const selected = selectedEmployee?.id === emp.id;
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => setSelectedEmployee(emp)}
                    className={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition ${
                      selected ? "border-brand-primary bg-brand-primary/10" : "border-brand-border/60 bg-white/90 hover:border-brand-primary"
                    }`}
                  >
                    <p className="font-semibold text-brand-text">{emp.name}</p>
                    <p className="text-xs text-slate-500">Основная роль: {emp.primaryRoleName ?? "—"}</p>
                  </button>
                );
              })}
            </div>
          )}
          {selectedEmployee && (
            <div className="space-y-2 rounded-2xl border border-brand-border/60 bg-white/90 p-3 text-sm text-slate-700">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Назначить роль</p>
              <p className="font-semibold text-brand-text">{selectedEmployee.name}</p>
              <select
                value={selectedRoleId}
                onChange={(event) => setSelectedRoleId(event.target.value)}
                className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
              >
                <option value="">Выберите роль</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <PrimaryButton onClick={() => void assignRole()} disabled={!selectedRoleId || assigning} className="px-3 py-2 text-xs">
                {assigning ? "Сохраняем…" : "Сохранить"}
              </PrimaryButton>
              {statusMessage && <p className="text-xs text-slate-500">{statusMessage}</p>}
              <SecondaryButton href={`/app/skills/employee/${selectedEmployee.id}`} className="px-3 py-2 text-xs">
                Посмотреть навыки
              </SecondaryButton>
            </div>
          )}
        </Card>
      </div>

      {dialogOpen && (
        <RoleProfileDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          initialProfile={editingRole ?? undefined}
          onSaved={() => {
            setDialogOpen(false);
            void loadRoles();
          }}
        />
      )}
    </div>
  );
}

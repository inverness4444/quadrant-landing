"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { RiskCaseSummary } from "@/services/types/riskCenter";
import type { RiskLevel, RiskStatus } from "@/drizzle/schema";

type RiskCenterClientProps = {
  workspaceId: string;
  workspaceName: string;
  currentUserId: string;
  initialCaseId?: string | null;
};

type RiskCaseApiModel = Omit<RiskCaseSummary, "detectedAt" | "updatedAt"> & { detectedAt: string; updatedAt: string };
type RiskListApiResponse = { ok: true; items: RiskCaseApiModel[]; total: number; openCount: number; highCount: number };
type RiskCaseApiResponse = { ok: true; case: RiskCaseApiModel };
type RiskApiError = { ok: false; error?: { message?: string } };
type RiskApiResponse = RiskListApiResponse | RiskCaseApiResponse | RiskApiError;

const STATUS_OPTIONS: Array<{ value: RiskStatus; label: string }> = [
  { value: "open", label: "Открытые" },
  { value: "monitoring", label: "Наблюдение" },
  { value: "resolved", label: "Закрытые" },
];

const LEVEL_OPTIONS: Array<{ value: RiskLevel; label: string }> = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export default function RiskCenterClient({
  workspaceId,
  workspaceName,
  currentUserId,
  initialCaseId = null,
}: RiskCenterClientProps) {
  const [cases, setCases] = useState<RiskCaseSummary[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [highCount, setHighCount] = useState(0);
  const [myCount, setMyCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [statuses, setStatuses] = useState<RiskStatus[]>(["open", "monitoring"]);
  const [levels, setLevels] = useState<RiskLevel[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(initialCaseId);
  const [detailOpen, setDetailOpen] = useState(Boolean(initialCaseId));
  const [resolutionNote, setResolutionNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => setSearch(searchTerm.trim()), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const deserializeCase = (item: RiskCaseApiModel): RiskCaseSummary => ({
    ...item,
    detectedAt: new Date(item.detectedAt),
    updatedAt: new Date(item.updatedAt),
  });

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      statuses.forEach((status) => params.append("statuses", status));
      levels.forEach((level) => params.append("levels", level));
      if (search) params.set("search", search);
      if (onlyMine) params.set("onlyMine", "true");
      params.set("limit", "50");
      const response = await fetch(`/api/app/risk-center/cases?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as RiskApiResponse | null;
      if (!response.ok || !payload || !("ok" in payload) || !payload.ok) {
        const message = payload && "ok" in payload && !payload.ok ? payload.error?.message : undefined;
        throw new Error(message ?? "Не удалось загрузить кейсы риска");
      }
      if ("items" in payload) {
        setCases(payload.items.map(deserializeCase));
        setTotal(payload.total ?? payload.items.length);
        setOpenCount(payload.openCount ?? 0);
        setHighCount(payload.highCount ?? 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }, [statuses, levels, search, onlyMine]);

  const loadMyCasesCount = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append("statuses", "open");
      params.append("statuses", "monitoring");
      params.set("onlyMine", "true");
      params.set("limit", "1");
      const response = await fetch(`/api/app/risk-center/cases?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as RiskApiResponse | null;
      if (response.ok && payload && "ok" in payload && payload.ok && "items" in payload) {
        setMyCount(payload.total ?? 0);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  useEffect(() => {
    void loadMyCasesCount();
  }, [loadMyCasesCount]);

  useEffect(() => {
    if (!initialCaseId) return;
    const found = cases.find((item) => item.id === initialCaseId);
    if (found) {
      setSelectedCaseId(found.id);
      setDetailOpen(true);
    }
  }, [cases, initialCaseId]);

  const selectedCase = useMemo(() => cases.find((item) => item.id === selectedCaseId) ?? null, [cases, selectedCaseId]);

  const toggleStatus = (value: RiskStatus) => {
    setStatuses((prev) => {
      if (prev.includes(value)) return prev.filter((status) => status !== value);
      return [...prev, value];
    });
  };

  const toggleLevel = (value: RiskLevel) => {
    setLevels((prev) => {
      if (prev.includes(value)) return prev.filter((level) => level !== value);
      return [...prev, value];
    });
  };

  const updateCaseInList = (updated: RiskCaseSummary) => {
    setCases((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  const updateStatus = async (status: RiskStatus) => {
    if (!selectedCase) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/app/risk-center/cases/${selectedCase.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolutionNote }),
      });
      const payload = (await response.json().catch(() => null)) as RiskApiResponse | null;
      if (!response.ok || !payload || !("ok" in payload) || !payload.ok || !("case" in payload)) {
        const message = payload && "ok" in payload && !payload.ok ? payload.error?.message : undefined;
        throw new Error(message ?? "Не удалось обновить статус");
      }
      const updated = deserializeCase(payload.case);
      updateCaseInList(updated);
      setSelectedCaseId(updated.id);
      if (status === "resolved") {
        setDetailOpen(false);
      }
      await loadCases();
      await loadMyCasesCount();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setActionLoading(false);
    }
  };

  const levelTone = (level: RiskLevel) => {
    if (level === "high") return "bg-red-100 text-red-700";
    if (level === "medium") return "bg-amber-100 text-amber-700";
    return "bg-emerald-100 text-emerald-700";
  };

  const statusTone = (status: RiskStatus) => {
    if (status === "open") return "bg-sky-100 text-sky-700";
    if (status === "monitoring") return "bg-amber-100 text-amber-700";
    return "bg-slate-100 text-slate-600";
  };

  const formatDate = (date: Date) => date.toLocaleDateString("ru-RU");

  return (
    <div className="space-y-8" data-workspace={workspaceId}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Risk Center</p>
          <h1 className="text-3xl font-semibold text-brand-text">Зона риска сотрудников</h1>
          <p className="text-sm text-slate-600">
            Сводка по рисковым сотрудникам workspace «{workspaceName}»: причины, ответственные, быстрые действия.
          </p>
        </div>
        <div className="flex gap-2">
          <SecondaryButton onClick={() => void loadCases()} className="px-4 py-2" disabled={loading}>
            Обновить
          </SecondaryButton>
        </div>
      </div>

      {error && <Card className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none bg-gradient-to-br from-red-100 via-white to-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-red-500">Открытых кейсов</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-brand-text">{openCount}</span>
            <span className="text-xs text-slate-500">open / monitoring</span>
          </div>
        </Card>
        <Card className="border-none bg-gradient-to-br from-amber-100 via-white to-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-600">High-risk</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-brand-text">{highCount}</span>
            <span className="text-xs text-slate-500">high severity</span>
          </div>
        </Card>
        <Card className="border-none bg-gradient-to-br from-sky-100 via-white to-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-600">Мои кейсы</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-brand-text">{myCount}</span>
            <span className="text-xs text-slate-500">owner: вы</span>
          </div>
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleStatus(option.value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  statuses.includes(option.value)
                    ? "bg-brand-primary text-white shadow-sm"
                    : "border border-brand-border text-slate-600 hover:border-brand-primary"
                }`}
              >
                {option.label}
              </button>
            ))}
            <div className="h-6 w-px bg-brand-border" />
            {LEVEL_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleLevel(option.value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  levels.includes(option.value)
                    ? "bg-brand-text text-white shadow-sm"
                    : "border border-brand-border text-slate-600 hover:border-brand-primary"
                }`}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setOnlyMine((prev) => !prev)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                onlyMine ? "bg-emerald-600 text-white shadow-sm" : "border border-brand-border text-slate-600 hover:border-brand-primary"
              }`}
            >
              {onlyMine ? "Мои кейсы" : "Все кейсы"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Поиск по сотруднику или кейсу"
              className="w-72 rounded-full border border-brand-border px-4 py-2 text-sm focus:border-brand-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-brand-border/60 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Сотрудник</th>
                <th className="px-3 py-2">Роль</th>
                <th className="px-3 py-2">Уровень</th>
                <th className="px-3 py-2">Статус</th>
                <th className="px-3 py-2">Источник</th>
                <th className="px-3 py-2">Заголовок</th>
                <th className="px-3 py-2">Ответственный</th>
                <th className="px-3 py-2">Обнаружено</th>
                <th className="px-3 py-2">Пилот</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/50">
              {cases.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-slate-500">
                    {loading ? "Загружаем кейсы…" : "Кейсы риска не найдены по выбранным фильтрам"}
                  </td>
                </tr>
              )}
              {cases.map((riskCase) => (
                <tr
                  key={riskCase.id}
                  className="cursor-pointer transition hover:bg-slate-50"
                  onClick={() => {
                    setSelectedCaseId(riskCase.id);
                    setDetailOpen(true);
                    setResolutionNote("");
                  }}
                >
                  <td className="px-3 py-3 font-semibold text-brand-primary">
                    <Link href={`/app/employee/${riskCase.employeeId}`} className="hover:underline">
                      {riskCase.employeeName}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{riskCase.employeeRole ?? "—"}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${levelTone(riskCase.level)}`}>
                      {riskCase.level}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(riskCase.status)}`}>
                      {riskCase.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{riskCase.source}</td>
                  <td className="px-3 py-3 text-brand-text">{riskCase.title}</td>
                  <td className="px-3 py-3 text-slate-600">
                    {riskCase.ownerUserId ? (riskCase.ownerUserId === currentUserId ? "Вы" : `User ${riskCase.ownerUserId}`) : "Не назначен"}
                  </td>
                  <td className="px-3 py-3 text-slate-600">{formatDate(riskCase.detectedAt)}</td>
                  <td className="px-3 py-3">
                    {riskCase.pilotId ? (
                      <Link href={`/app/pilot/${riskCase.pilotId}`} className="text-brand-primary hover:underline">
                        Открыть пилот
                      </Link>
                    ) : (
                      <Tag variant="outline">Не привязан</Tag>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Всего: {total}</span>
          <span>Показано: {cases.length}</span>
        </div>
      </Card>

      {detailOpen && selectedCase && (
        <div className="fixed inset-0 z-40 flex items-start justify-end bg-black/40 p-4">
          <div className="h-full w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Risk case</p>
                <h3 className="text-2xl font-semibold text-brand-text">{selectedCase.title}</h3>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className={`rounded-full px-3 py-1 font-semibold ${levelTone(selectedCase.level)}`}>{selectedCase.level}</span>
                  <span className={`rounded-full px-3 py-1 font-semibold ${statusTone(selectedCase.status)}`}>
                    {selectedCase.status}
                  </span>
                  <Tag variant="outline">{selectedCase.source}</Tag>
                </div>
              </div>
              <button
                type="button"
                className="text-slate-400 transition hover:text-slate-600"
                onClick={() => setDetailOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-brand-border/60 bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Сотрудник</p>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-brand-text">{selectedCase.employeeName}</p>
                    <p className="text-sm text-slate-600">{selectedCase.employeeRole ?? "Роль не указана"}</p>
                    <p className="text-xs text-slate-500">
                      Ответственный: {selectedCase.ownerUserId ? (selectedCase.ownerUserId === currentUserId ? "Вы" : selectedCase.ownerUserId) : "не назначен"}
                    </p>
                  </div>
                  <Link href={`/app/employee/${selectedCase.employeeId}`} className="text-sm font-semibold text-brand-primary">
                    Открыть профиль →
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-brand-border/60 bg-white/80 p-4 space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Причина</p>
                <p className="text-sm text-slate-700">{selectedCase.reason ?? "Описание не задано"}</p>
              </div>
              <div className="rounded-2xl border border-brand-border/60 bg-white/80 p-4 space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Рекомендация</p>
                <p className="text-sm text-slate-700">
                  {selectedCase.recommendation ?? "Добавьте рекомендацию: пилот, 1:1, замена или смена роли."}
                </p>
              </div>

              <div className="rounded-2xl border border-brand-border/60 bg-white/80 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Пилот</p>
                    <p className="text-sm text-slate-700">
                      {selectedCase.pilotId ? "Пилот привязан" : "Пилот пока не привязан"}
                    </p>
                  </div>
                  {selectedCase.pilotId ? (
                    <Link href={`/app/pilot/${selectedCase.pilotId}`} className="text-sm font-semibold text-brand-primary">
                      Открыть пилот →
                    </Link>
                  ) : (
                    <PrimaryButton href={`/app/pilots/templates?employeeId=${selectedCase.employeeId}`} className="px-3 py-2 text-xs">
                      Создать пилот по шаблону
                    </PrimaryButton>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-brand-border/60 bg-white/80 p-4 space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Действия</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCase.status === "open" && (
                    <SecondaryButton
                      onClick={() => void updateStatus("monitoring")}
                      disabled={actionLoading}
                      className="px-4 py-2"
                    >
                      Перевести в мониторинг
                    </SecondaryButton>
                  )}
                  {selectedCase.status !== "resolved" && (
                    <PrimaryButton onClick={() => void updateStatus("resolved")} disabled={actionLoading} className="px-4 py-2">
                      Закрыть кейс
                    </PrimaryButton>
                  )}
                  <SecondaryButton href={`/app/meetings`} className="px-4 py-2">
                    Назначить 1:1
                  </SecondaryButton>
                </div>
                <label className="block text-xs text-slate-500">
                  Комментарий при закрытии
                  <textarea
                    value={resolutionNote}
                    onChange={(event) => setResolutionNote(event.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                    placeholder="Что сделали для снятия риска"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

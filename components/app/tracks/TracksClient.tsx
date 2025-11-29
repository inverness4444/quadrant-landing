"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import TrackFormModal from "@/components/app/tracks/TrackFormModal";
import type { Employee, Track, TrackLevel } from "@/drizzle/schema";
import { buildCsrfHeader } from "@/lib/csrf";

type TracksClientProps = {
  tracks: Track[];
  trackLevels: TrackLevel[];
  employees: Employee[];
  openCreateModalOnMount?: boolean;
};

export default function TracksClient({
  tracks,
  trackLevels,
  employees,
  openCreateModalOnMount = false,
}: TracksClientProps) {
  const router = useRouter();
  const [activeTrackId, setActiveTrackId] = useState(tracks[0]?.id ?? null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [renameValue, setRenameValue] = useState<string>(tracks[0]?.name ?? "");
  const [renameLoading, setRenameLoading] = useState(false);
  const [levelMessages, setLevelMessages] = useState<Record<string, string | null>>({});

  const activeTrack = tracks.find((track) => track.id === activeTrackId) ?? tracks[0] ?? null;

  const levelsForTrack = useMemo(() => {
    if (!activeTrack) return [];
    return trackLevels
      .filter((level) => level.trackId === activeTrack.id)
      .sort((a, b) => a.order - b.order);
  }, [activeTrack, trackLevels]);

  const employeesByTrack = useMemo(() => {
    const map = new Map<string, Array<{ employee: Employee; levelName?: string }>>();
    tracks.forEach((track) => {
      map.set(track.id, []);
    });
    const levelMap = new Map(trackLevels.map((level) => [level.id, level]));
    employees.forEach((employee) => {
      if (!employee.primaryTrackId) return;
      const level = employee.trackLevelId ? levelMap.get(employee.trackLevelId) : undefined;
      if (!map.has(employee.primaryTrackId)) {
        map.set(employee.primaryTrackId, []);
      }
      map.get(employee.primaryTrackId)?.push({
        employee,
        levelName: level?.name,
      });
    });
    return map;
  }, [employees, tracks, trackLevels]);

  const handleCreateTrack = async (payload: { name: string; levels: Array<{ name: string; description: string }> }) => {
    setSaving(true);
    setModalError(null);
    const response = await fetch("/api/app/tracks", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...buildCsrfHeader() },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setModalError(data.message || "Не удалось создать трек");
      return;
    }
    setModalOpen(false);
    startTransition(() => router.refresh());
  };

  const handleRename = async () => {
    if (!activeTrack) return;
    setRenameLoading(true);
    const response = await fetch(`/api/app/tracks/${activeTrack.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...buildCsrfHeader() },
      body: JSON.stringify({ name: renameValue }),
    });
    setRenameLoading(false);
    if (!response.ok) {
      alert("Не удалось обновить название трека");
      return;
    }
    startTransition(() => router.refresh());
  };

  const handleLevelUpdate = async (level: TrackLevel, description: string) => {
    const response = await fetch(`/api/app/track-levels/${level.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...buildCsrfHeader() },
      body: JSON.stringify({ description }),
    });
    if (!response.ok) {
      setLevelMessages((prev) => ({ ...prev, [level.id]: "Ошибка при сохранении" }));
      return;
    }
    setLevelMessages((prev) => ({ ...prev, [level.id]: "Сохранено" }));
    startTransition(() => router.refresh());
    setTimeout(() => {
      setLevelMessages((prev) => ({ ...prev, [level.id]: null }));
    }, 2000);
  };

  useEffect(() => {
    if (activeTrack) {
      setRenameValue(activeTrack.name);
    } else {
      setRenameValue("");
    }
  }, [activeTrack]);

  useEffect(() => {
    if (openCreateModalOnMount) {
      setModalError(null);
      setModalOpen(true);
    }
  }, [openCreateModalOnMount]);

  const activeEmployees = activeTrack ? employeesByTrack.get(activeTrack.id) ?? [] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-text">Карьерные треки</h1>
          <p className="text-sm text-slate-600">Прозрачные ожидания по росту команды</p>
        </div>
        <PrimaryButton onClick={() => setModalOpen(true)} className="px-4 py-2">
          Новый трек
        </PrimaryButton>
      </div>
      {tracks.length === 0 && (
        <Card className="text-center">
          <p className="text-lg font-semibold text-brand-text">Пока нет карьерных треков</p>
          <p className="mt-2 text-sm text-slate-600">
            Создайте трек, чтобы описать, чем Junior отличается от Senior.
          </p>
        </Card>
      )}
      {tracks.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
          <Card className="space-y-3">
            {tracks.map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => {
                  setActiveTrackId(track.id);
                  setRenameValue(track.name);
                }}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  activeTrack?.id === track.id
                    ? "border-brand-primary bg-brand-primary/10"
                    : "border-brand-border hover:border-brand-primary/60"
                }`}
              >
                <p className="font-semibold text-brand-text">{track.name}</p>
                <p className="text-xs text-slate-500">
                  {levelsCount(track.id, trackLevels)} уровней ·{" "}
                  {(employeesByTrack.get(track.id) ?? []).length} сотрудников
                </p>
              </button>
            ))}
          </Card>
          {activeTrack && (
            <div className="space-y-6">
              <Card className="space-y-3">
                <p className="text-sm font-semibold text-slate-600">Название</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    className="h-11 flex-1 rounded-xl border border-brand-border px-4"
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                  />
                  <PrimaryButton onClick={handleRename} disabled={renameLoading || !renameValue.trim()}>
                    {renameLoading ? "Сохраняем..." : "Сохранить"}
                  </PrimaryButton>
                </div>
              </Card>
              <Card className="space-y-4">
                <p className="text-sm font-semibold text-slate-600">Уровни</p>
                {levelsForTrack.map((level) => (
                  <div key={level.id} className="rounded-2xl border border-brand-border p-4">
                    <p className="text-sm font-semibold text-brand-text">{level.name}</p>
                    <textarea
                      className="mt-2 w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
                      rows={3}
                      defaultValue={level.description}
                      onBlur={(event) => handleLevelUpdate(level, event.target.value)}
                    />
                    <p className="text-xs text-slate-500">
                      {levelMessages[level.id] ?? "Текст обновляется автоматически при потере фокуса"}
                    </p>
                  </div>
                ))}
              </Card>
              <Card className="space-y-3">
                <p className="text-sm font-semibold text-slate-600">
                  Сотрудники в треке ({activeEmployees.length})
                </p>
                {activeEmployees.length === 0 && (
                  <p className="text-sm text-slate-500">
                    Пока никто не закреплён за треком. Настройте это на вкладке «Команда».
                  </p>
                )}
                <div className="space-y-2">
                  {activeEmployees.map(({ employee, levelName }) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between rounded-2xl bg-brand-muted px-3 py-2"
                    >
                      <div>
                        <p className="font-semibold text-brand-text">{employee.name}</p>
                        <p className="text-xs text-slate-500">{employee.position}</p>
                      </div>
                      <span className="text-xs text-brand-primary">{levelName || employee.level}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
      <TrackFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateTrack}
        saving={saving || isPending}
        error={modalError}
      />
    </div>
  );
}

function levelsCount(trackId: string, levels: TrackLevel[]) {
  return levels.filter((level) => level.trackId === trackId).length;
}

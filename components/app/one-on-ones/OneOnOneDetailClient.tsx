"use client";

import { useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { OneOnOne, OneOnOneLink, OneOnOneNote } from "@/drizzle/schema";

type Props = {
  initial: { oneOnOne: OneOnOne; notes: OneOnOneNote[]; links: OneOnOneLink[] };
};

export default function OneOnOneDetailClient({ initial }: Props) {
  const [data, setData] = useState(initial);
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState<"private" | "shared_with_employee">("private");
  const [error, setError] = useState<string | null>(null);

  const addNote = async () => {
    setError(null);
    try {
      const resp = await fetch(`/api/app/one-on-ones/${data.oneOnOne.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: note, visibility }),
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || !json?.ok) throw new Error(json?.error?.message ?? "Не удалось сохранить заметку");
      setData((prev) => ({ ...prev, notes: [...prev.notes, json.note] }));
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  const updateStatus = async (status: OneOnOne["status"]) => {
    try {
      const resp = await fetch(`/api/app/one-on-ones/${data.oneOnOne.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || !json?.ok) throw new Error(json?.error?.message ?? "Не удалось обновить статус");
      setData((prev) => ({ ...prev, oneOnOne: json.oneOnOne }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">1:1</p>
        <h1 className="text-3xl font-semibold text-brand-text">Встреча</h1>
        <p className="text-sm text-slate-600">
          {new Date(data.oneOnOne.scheduledAt).toLocaleString("ru-RU")} · {data.oneOnOne.durationMinutes} мин
        </p>
        <div className="flex gap-2">
          <Tag variant="outline">Статус: {data.oneOnOne.status}</Tag>
        </div>
      </div>

      <Card className="space-y-2">
        <h3 className="text-lg font-semibold text-brand-text">Действия</h3>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={() => void updateStatus("completed")} className="px-3 py-1 text-xs">
            Завершить
          </PrimaryButton>
          <SecondaryButton onClick={() => void updateStatus("cancelled")} className="px-3 py-1 text-xs">
            Отменить
          </SecondaryButton>
        </div>
      </Card>

      <Card className="space-y-2">
        <h3 className="text-lg font-semibold text-brand-text">Заметки</h3>
        <div className="space-y-2">
          {data.notes.map((n) => (
            <div key={n.id} className="rounded-xl border border-brand-border/50 bg-white/90 p-3 text-sm text-slate-700">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{new Date(n.createdAt).toLocaleString("ru-RU")}</span>
                <Tag variant="outline">{n.visibility}</Tag>
              </div>
              <p className="mt-1">{n.text}</p>
            </div>
          ))}
          {data.notes.length === 0 && <p className="text-sm text-slate-500">Заметок пока нет.</p>}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm"
          rows={3}
          placeholder="Что обсудили, договорённости, риски"
        />
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as "private" | "shared_with_employee")}
            className="rounded-xl border border-brand-border px-2 py-1 text-xs"
          >
            <option value="private">Только менеджер</option>
            <option value="shared_with_employee">Поделиться с сотрудником</option>
          </select>
          <PrimaryButton onClick={() => void addNote()} disabled={!note} className="px-3 py-1 text-xs">
            Добавить заметку
          </PrimaryButton>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>

      <Card className="space-y-2">
        <h3 className="text-lg font-semibold text-brand-text">Связанные сущности</h3>
        {data.links.length === 0 && <p className="text-sm text-slate-500">Пока нет связей.</p>}
        <ul className="space-y-1 text-sm text-slate-700">
          {data.links.map((l) => (
            <li key={l.id} className="rounded-lg border border-brand-border/50 px-3 py-2">
              {l.entityType}: {l.entityId}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

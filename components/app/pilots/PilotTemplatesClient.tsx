"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import Tag from "@/components/common/Tag";
import type { PilotTemplateSummary } from "@/services/pilotTemplateService";
import PilotWizard from "@/components/app/pilots/PilotWizard";

export default function PilotTemplatesClient() {
  const [templates, setTemplates] = useState<PilotTemplateSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGlobal, setShowGlobal] = useState(true);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [intensity, setIntensity] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PilotTemplateSummary | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGlobal, includeArchived]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ includeGlobal: String(showGlobal), includeArchived: String(includeArchived) });
      const res = await fetch(`/api/app/pilot-templates?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error?.message ?? "Ошибка загрузки шаблонов");
      setTemplates(json.templates ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return templates.filter((tpl) => {
      if (intensity && tpl.intensityLevel !== intensity) return false;
      if (search && !tpl.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [templates, intensity, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Pilots</p>
        <h1 className="text-3xl font-semibold text-brand-text">Шаблоны пилотов</h1>
        <p className="text-sm text-slate-600">Выберите готовый сценарий пилота, чтобы запустить за пару минут.</p>
      </div>

      <Card className="space-y-3">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="space-y-1 text-sm text-slate-600">
            Показать
            <select value={showGlobal ? "all" : "workspace"} onChange={(e) => setShowGlobal(e.target.value !== "workspace")} className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm">
              <option value="all">Глобальные и рабочие</option>
              <option value="workspace">Только рабочие</option>
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-600">
            Интенсивность
            <select value={intensity ?? ""} onChange={(e) => setIntensity(e.target.value || null)} className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm">
              <option value="">Все</option>
              <option value="light">Light</option>
              <option value="normal">Normal</option>
              <option value="intensive">Intensive</option>
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-600">
            Поиск
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm" placeholder="Название шаблона" />
          </label>
          <label className="flex items-end gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} /> Показывать архивные
          </label>
        </div>
      </Card>

      {error && <Card className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>}

      <div className="grid gap-3 md:grid-cols-2">
        {loading && <Card className="p-4 text-sm text-slate-500">Загружаем шаблоны...</Card>}
        {!loading && filtered.length === 0 && <Card className="p-4 text-sm text-slate-500">Шаблоны не найдены.</Card>}
        {filtered.map((tpl) => (
          <Card key={tpl.id} className="flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-brand-text">{tpl.title}</h3>
                <p className="text-sm text-slate-600">{tpl.description}</p>
              </div>
              <Tag variant="outline">{tpl.isGlobal ? "Глобальный" : "Ваш шаблон"}</Tag>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              {tpl.targetRole && <Tag variant="outline">{tpl.targetRole}</Tag>}
              {tpl.suggestedDurationWeeks && <Tag variant="outline">~{tpl.suggestedDurationWeeks} нед.</Tag>}
              {tpl.intensityLevel && <Tag variant="outline">{tpl.intensityLevel}</Tag>}
            </div>
            <div className="flex gap-2">
              <PrimaryButton className="px-4 py-2" onClick={() => setSelectedTemplate(tpl)}>
                Использовать
              </PrimaryButton>
            </div>
          </Card>
        ))}
      </div>

      {selectedTemplate && <PilotWizard template={selectedTemplate} onClose={() => setSelectedTemplate(null)} />}
    </div>
  );
}

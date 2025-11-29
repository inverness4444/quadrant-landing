"use client";

import { useMemo, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import type { ProgramTemplate, ProgramStatus, WorkspaceProgram } from "@/drizzle/schema";

type Props = {
  templates: ProgramTemplate[];
  programs: WorkspaceProgram[];
  workspaceName: string;
};

export default function ProgramsPageClient({ templates, programs, workspaceName }: Props) {
  const [activeTab, setActiveTab] = useState<"programs" | "templates">("programs");

  const groupedPrograms = useMemo(() => {
    const byStatus: Record<ProgramStatus, WorkspaceProgram[]> = {
      draft: [],
      active: [],
      paused: [],
      completed: [],
    };
    programs.forEach((p) => {
      if (byStatus[p.status]) {
        byStatus[p.status].push(p);
      }
    });
    return byStatus;
  }, [programs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Programs</p>
          <h1 className="text-3xl font-semibold text-brand-text">Программы Quadrant</h1>
          <p className="text-sm text-slate-600">
            Готовые сценарии развития, объединяющие пилоты, цели, опросы и 1:1 для workspace «{workspaceName}».
          </p>
        </div>
        <PrimaryButton href="/app/programs/new">Создать программу</PrimaryButton>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
            activeTab === "programs" ? "bg-brand-primary text-white" : "bg-white text-slate-600"
          }`}
          onClick={() => setActiveTab("programs")}
        >
          Активные программы
        </button>
        <button
          type="button"
          className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
            activeTab === "templates" ? "bg-brand-primary text-white" : "bg-white text-slate-600"
          }`}
          onClick={() => setActiveTab("templates")}
        >
          Шаблоны программ
        </button>
      </div>

      {activeTab === "programs" ? (
        <Card className="space-y-4">
          {programs.length === 0 && <p className="text-sm text-slate-500">Программ пока нет. Создайте первую из шаблона.</p>}
          {(["active", "draft", "paused", "completed"] as ProgramStatus[]).map((status) => (
            <div key={status} className="space-y-2">
              <h3 className="text-sm font-semibold text-brand-text">{statusLabel(status)}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {groupedPrograms[status]?.map((program) => (
                  <Card key={program.id} className="border border-white/60 bg-white/90 p-4 text-sm text-slate-700">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-lg font-semibold text-brand-text">{program.name}</h4>
                        <p className="text-xs text-slate-500">{program.description}</p>
                        <p className="mt-2 text-xs text-slate-500">Участников: {parseIds(program.targetEmployeeIds).length}</p>
                        {program.startedAt && (
                          <p className="text-xs text-slate-500">Старт: {formatDate(program.startedAt)} → {program.plannedEndAt ? formatDate(program.plannedEndAt) : "?"}</p>
                        )}
                      </div>
                      <SecondaryButton href={`/app/programs/${program.id}`} className="px-3 py-1 text-xs">
                        Открыть
                      </SecondaryButton>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </Card>
      ) : (
        <Card className="space-y-4">
          {templates.map((tpl) => (
            <Card key={tpl.code} className="border border-white/60 bg-white/90 p-4 text-sm text-slate-700">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-brand-text">{tpl.name}</h3>
                  <p className="text-xs text-slate-500">{tpl.description}</p>
                  <p className="mt-1 text-xs text-slate-500">Длительность по умолчанию: {tpl.defaultDurationDays} дней</p>
                  {tpl.targetSizeHint && <p className="text-xs text-slate-500">Размер группы: {tpl.targetSizeHint}</p>}
                </div>
                <PrimaryButton href={`/app/programs/new?template=${tpl.code}`} className="px-3 py-1 text-xs">
                  Создать программу
                </PrimaryButton>
              </div>
            </Card>
          ))}
        </Card>
      )}
    </div>
  );
}

function parseIds(raw: string) {
  try {
    const val = JSON.parse(raw);
    if (Array.isArray(val)) return val as string[];
  } catch {
    return [];
  }
  return [];
}

function statusLabel(status: ProgramStatus) {
  const map: Record<ProgramStatus, string> = {
    draft: "Черновик",
    active: "Активна",
    paused: "Пауза",
    completed: "Завершена",
  };
  return map[status] ?? status;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU");
}

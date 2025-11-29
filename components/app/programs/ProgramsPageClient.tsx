"use client";

import Link from "next/link";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import Tag from "@/components/common/Tag";
import type { ProgramTemplate, WorkspaceProgram } from "@/drizzle/schema";

type Props = {
  templates: ProgramTemplate[];
  programs: WorkspaceProgram[];
  workspaceName: string;
};

export default function ProgramsPageClient({ templates, programs, workspaceName }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Programs</p>
          <h1 className="text-3xl font-semibold text-brand-text">Программы Quadrant</h1>
          <p className="text-sm text-slate-600">{workspaceName}. Готовые сценарии развития для команд.</p>
        </div>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-brand-text">Активные программы</h2>
            <p className="text-sm text-slate-600">Черновики и запущенные инициативы.</p>
          </div>
          <Link href="/app/programs/new" className="text-sm text-brand-primary underline">
            Создать программу
          </Link>
        </div>
        {programs.length === 0 && <p className="text-sm text-slate-600">Пока нет программ.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {programs.map((program) => (
            <Card key={program.id} className="border border-brand-border/70 bg-white/90 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-brand-text">{program.name}</h3>
                  <p className="text-sm text-slate-600">{program.description}</p>
                </div>
                <Tag variant="outline">{program.status}</Tag>
              </div>
              <div className="mt-3 flex gap-2 text-sm">
                <Link href={`/app/programs/${program.id}`} className="rounded-xl bg-brand-primary px-3 py-1 text-white">
                  Открыть
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-brand-text">Шаблоны программ</h2>
            <p className="text-sm text-slate-600">Выберите сценарий и запустите для своей команды.</p>
          </div>
        </div>
        {templates.length === 0 && <p className="text-sm text-slate-600">Шаблонов пока нет.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="border border-brand-border/70 bg-white/90 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-brand-text">{tpl.name}</h3>
                  <p className="text-sm text-slate-600">{tpl.description}</p>
                  <p className="text-xs text-slate-500">Продолжительность: {tpl.defaultDurationDays} дн.</p>
                </div>
                <Tag variant="outline">{tpl.code}</Tag>
              </div>
              <div className="mt-3 flex gap-2 text-sm">
                <PrimaryButton href={`/app/programs/new?template=${tpl.code}`} className="px-3 py-1 text-sm">
                  Запустить
                </PrimaryButton>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}

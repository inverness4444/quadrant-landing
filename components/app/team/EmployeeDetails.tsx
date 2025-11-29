'use client';

import { useEffect, useMemo, useState } from "react";
import Tag from "@/components/common/Tag";
import type { Artifact, ArtifactSkill, Employee, Skill, Track, TrackLevel } from "@/drizzle/schema";

type SkillWithLevel = {
  skill: Skill;
  level: number;
};

type ArtifactDetail = Artifact & {
  skillDetails: Array<{ skill: Skill; confidence: number }>;
};

type EmployeeDetailsProps = {
  employee?: Employee;
  skills: SkillWithLevel[];
  track?: Track | null;
  trackLevel?: TrackLevel | null;
  allSkills: Skill[];
};

const DEFAULT_PAGE_SIZE = 5;

type ArtifactState = {
  artifacts: Artifact[];
  artifactSkills: ArtifactSkill[];
  page: number;
  pageSize: number;
  total: number;
};

export default function EmployeeDetails({ employee, skills, track, trackLevel, allSkills }: EmployeeDetailsProps) {
  const [artifactState, setArtifactState] = useState<ArtifactState>({
    artifacts: [],
    artifactSkills: [],
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
  });
  const [artifactError, setArtifactError] = useState<string | null>(null);
  const [artifactLoading, setArtifactLoading] = useState(false);

  const skillLookup = useMemo(() => new Map(allSkills.map((skill) => [skill.id, skill])), [allSkills]);

  const artifactDetails = useMemo<ArtifactDetail[]>(() => {
    const grouped = new Map<string, ArtifactDetail>();
    for (const artifact of artifactState.artifacts) {
      grouped.set(artifact.id, { ...artifact, skillDetails: [] });
    }
    for (const assignment of artifactState.artifactSkills) {
      const target = grouped.get(assignment.artifactId);
      if (!target) continue;
      const skill = skillLookup.get(assignment.skillId);
      if (!skill) continue;
      target.skillDetails.push({ skill, confidence: assignment.confidence ?? 0 });
    }
    return Array.from(grouped.values());
  }, [artifactState.artifacts, artifactState.artifactSkills, skillLookup]);

  const fetchArtifacts = async (page: number) => {
    if (!employee) return;
    const currentPageSize = artifactState.pageSize || DEFAULT_PAGE_SIZE;
    setArtifactLoading(true);
    setArtifactError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(currentPageSize),
      });
      const response = await fetch(`/api/app/employees/${employee.id}/artifacts?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || "Не удалось загрузить артефакты");
      }
      setArtifactState({
        artifacts: data.artifacts ?? [],
        artifactSkills: data.artifactSkills ?? [],
        page: data.page ?? page,
        pageSize: data.pageSize ?? currentPageSize,
        total: data.total ?? 0,
      });
    } catch (error) {
      setArtifactError((error as Error).message);
    } finally {
      setArtifactLoading(false);
    }
  };

  useEffect(() => {
    if (!employee) {
      setArtifactState({ artifacts: [], artifactSkills: [], page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 });
      setArtifactError(null);
      return;
    }
    void fetchArtifacts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.id]);

  if (!employee) {
    return (
      <div className="rounded-3xl border border-dashed border-brand-border bg-white/70 px-4 py-10 text-center text-sm text-slate-500">
        Выберите сотрудника, чтобы увидеть детали
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil((artifactState.total || 0) / (artifactState.pageSize || DEFAULT_PAGE_SIZE)));
  const canPrev = artifactState.page > 1;
  const canNext = artifactState.page < totalPages;
  const showEmptyArtifacts = artifactDetails.length === 0 && !artifactLoading && !artifactError;

  return (
    <div className="rounded-3xl border border-brand-border bg-white p-5 shadow-sm">
      <p className="text-xs uppercase text-slate-500">Выбран</p>
      <p className="text-xl font-semibold text-brand-text">{employee.name}</p>
      <p className="text-sm text-slate-500">{employee.position}</p>
      <div className="mt-4 space-y-3 text-sm text-slate-600">
        <p>
          Уровень: <span className="font-semibold">{employee.level}</span>
        </p>
        {track && (
          <p>
            Трек: <span className="font-semibold">{track.name}</span>{" "}
            {trackLevel && <span className="text-slate-500">({trackLevel.name})</span>}
          </p>
        )}
      </div>
      <div className="mt-4 space-y-2">
        <p className="text-sm font-semibold text-slate-600">Навыки</p>
        <div className="flex flex-wrap gap-2">
          {skills.length > 0 ? (
            skills.map((entry) => (
              <Tag key={entry.skill.id}>
                {entry.skill.name} · {entry.level}/5
              </Tag>
            ))
          ) : (
            <p className="text-sm text-slate-500">Навыки ещё не назначены</p>
          )}
        </div>
      </div>
      <div className="mt-6 space-y-2">
        <p className="text-sm font-semibold text-slate-600">Артефакты</p>
        {artifactError && <p className="text-sm text-red-500">{artifactError}</p>}
        {artifactLoading && <p className="text-sm text-slate-500">Загружаем артефакты…</p>}
        {showEmptyArtifacts && <p className="text-sm text-slate-500">Пока нет артефактов</p>}
        {artifactDetails.map((artifact) => (
          <div key={artifact.id} className="rounded-2xl border border-brand-border/70 p-3">
            <p className="text-sm font-semibold text-brand-text">{artifact.title}</p>
            <p className="text-xs text-slate-500">{artifact.type}</p>
            <p className="mt-2 text-sm text-slate-600">{artifact.description}</p>
            {artifact.link && (
              <a
                href={artifact.link}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs font-semibold text-brand-link"
              >
                Открыть
              </a>
            )}
            {artifact.skillDetails.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {artifact.skillDetails.map((entry) => (
                  <Tag key={entry.skill.id}>
                    {entry.skill.name} · вклад {Math.round(entry.confidence * 100)}%
                  </Tag>
                ))}
              </div>
            )}
          </div>
        ))}
        {artifactDetails.length > 0 && (
          <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
            <span>
              Страница {artifactState.page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fetchArtifacts(artifactState.page - 1)}
                disabled={!canPrev || artifactLoading}
                className="rounded-xl border border-brand-border px-3 py-1 disabled:opacity-50"
              >
                Назад
              </button>
              <button
                type="button"
                onClick={() => fetchArtifacts(artifactState.page + 1)}
                disabled={!canNext || artifactLoading}
                className="rounded-xl border border-brand-border px-3 py-1 disabled:opacity-50"
              >
                Вперёд
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

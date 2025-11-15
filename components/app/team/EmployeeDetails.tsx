import Tag from "@/components/common/Tag";
import type { Employee, Skill, Track, TrackLevel } from "@/drizzle/schema";

type SkillWithLevel = {
  skill: Skill;
  level: number;
};

type EmployeeDetailsProps = {
  employee?: Employee;
  skills: SkillWithLevel[];
  track?: Track | null;
  trackLevel?: TrackLevel | null;
};

export default function EmployeeDetails({ employee, skills, track, trackLevel }: EmployeeDetailsProps) {
  if (!employee) {
    return (
      <div className="rounded-3xl border border-dashed border-brand-border bg-white/70 px-4 py-10 text-center text-sm text-slate-500">
        Выберите сотрудника, чтобы увидеть детали
      </div>
    );
  }

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
    </div>
  );
}

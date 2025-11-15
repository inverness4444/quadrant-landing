"use client";

import { useMemo, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import type { DemoCareerTrack, DemoEmployee } from "@/content/demo";
import { trackEvent } from "@/services/analytics";

type CareerTrackProps = {
  tracks: DemoCareerTrack[];
  employees: DemoEmployee[];
};

export default function CareerTrack({ tracks, employees }: CareerTrackProps) {
  const [currentId, setCurrentId] = useState(tracks[0]?.employeeId ?? "");
  const current = useMemo(
    () => tracks.find((track) => track.employeeId === currentId) ?? tracks[0],
    [tracks, currentId],
  );
  const employee = employees.find((emp) => emp.id === current?.employeeId);

  if (!current || !employee) return null;

  return (
    <section id="career" className="space-y-6">
      <div className="space-y-4 rounded-3xl border border-brand-border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-semibold text-slate-600">
            Сотрудник
            <select
              value={currentId}
              onChange={(event) => setCurrentId(event.target.value)}
              className="mt-1 h-11 rounded-2xl border border-brand-border px-4 text-brand-text"
            >
              {tracks.map((track) => {
                const emp = employees.find((e) => e.id === track.employeeId);
                return (
                  <option key={track.employeeId} value={track.employeeId}>
                    {emp?.name} — {emp?.role}
                  </option>
                );
              })}
            </select>
          </label>
          <p className="text-sm text-slate-500">
            {employee.team} · {employee.grade}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {current.steps.map((step) => (
            <Card key={step.level} className={step.completed ? "border-brand-primary/60" : ""}>
              <p className="text-xs font-semibold uppercase text-slate-500">{step.level}</p>
              <p className="text-sm text-slate-600">{step.description}</p>
              <p
                className={`mt-3 text-xs font-semibold ${step.completed ? "text-emerald-600" : "text-slate-400"}`}
              >
                {step.completed ? "✅ выполнено" : "В процессе"}
              </p>
            </Card>
          ))}
        </div>
        <PrimaryButton
          href="/contact"
          className="mt-2"
          onClick={() => trackEvent("cta_click", { location: "career-track" })}
        >
          Запросить демо
        </PrimaryButton>
      </div>
    </section>
  );
}

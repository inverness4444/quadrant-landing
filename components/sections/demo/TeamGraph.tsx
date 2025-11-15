"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { DemoEmployee, DemoEdge, DemoSkill } from "@/content/demo";
import Card from "@/components/common/Card";

const ForceGraph2D = dynamic(() => import("react-force-graph").then((mod) => mod.ForceGraph2D), {
  ssr: false,
});

type TeamGraphProps = {
  employees: DemoEmployee[];
  skills: DemoSkill[];
  edges: DemoEdge[];
};

type NodeData =
  | (DemoEmployee & { type: "employee" })
  | (DemoSkill & { type: "skill" });

type LinkData = DemoEdge & { source: string; target: string };

export default function TeamGraph({ employees, skills, edges }: TeamGraphProps) {
  const data = useMemo(() => {
    const nodes: NodeData[] = [
      ...employees.map((e) => ({ ...e, type: "employee" as const })),
      ...skills.map((s) => ({ ...s, type: "skill" as const })),
    ];
    const links: LinkData[] = edges.map((edge) => ({ ...edge }));
    return { nodes, links };
  }, [employees, skills, edges]);

  const firstEmployee: NodeData | null = employees[0]
    ? { ...employees[0], type: "employee" as const }
    : null;
  const [selected, setSelected] = useState<NodeData | null>(firstEmployee);

  const handleClick = (node: NodeData) => {
    setSelected(node);
  };

  const highlightNodes = useMemo(() => {
    if (!selected) return new Set<string>();
    const ids = new Set<string>();
    ids.add(selected.id);
    if (selected.type === "employee") {
      edges
        .filter((edge) => edge.source === selected.id || edge.target === selected.id)
        .forEach((edge) => {
          ids.add(edge.source);
          ids.add(edge.target);
        });
    } else {
      edges
        .filter((edge) => edge.target === selected.id)
        .forEach((edge) => ids.add(edge.source));
    }
    return ids;
  }, [edges, selected]);

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <Card className="min-h-[400px]">
        <ForceGraph2D
          graphData={data}
          height={420}
          nodeCanvasObject={(node, ctx) => {
            const typed = node as NodeData;
            ctx.beginPath();
            ctx.fillStyle = typed.type === "employee" ? "#f44336" : "#1f55b5";
            ctx.arc(node.x ?? 0, node.y ?? 0, typed.type === "employee" ? 8 : 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.font = "12px Inter";
            ctx.fillStyle = highlightNodes.has(typed.id) ? "#111" : "#555";
            ctx.fillText(typed.type === "employee" ? typed.name : typed.label, (node.x ?? 0) + 10, node.y ?? 0 + 4);
          }}
          linkColor={() => "#d7dce8"}
          linkWidth={(link) => {
            const sourceId = typeof link.source === "string" ? link.source : (link.source as { id: string }).id;
            const targetId = typeof link.target === "string" ? link.target : (link.target as { id: string }).id;
            return highlightNodes.has(sourceId) && highlightNodes.has(targetId) ? 2 : 0.5;
          }}
          onNodeClick={(node) => handleClick(node as NodeData)}
          autoPauseRedraw={false}
        />
      </Card>
      <Card className="space-y-3">
        {selected ? (
          <>
            <p className="text-sm uppercase text-slate-500">{selected.type === "employee" ? "Сотрудник" : "Навык"}</p>
            <p className="text-xl font-semibold text-brand-text">
              {selected.type === "employee" ? selected.name : selected.label}
            </p>
            {selected.type === "employee" ? (
              <>
                <p className="text-sm text-slate-600">{selected.role} · {selected.team}</p>
                <p className="text-xs font-semibold text-brand-primary">Грейд: {selected.grade}</p>
                <div>
                  <p className="text-sm font-semibold text-brand-text">Артефакты</p>
                  <ul className="mt-1 space-y-1 text-sm text-slate-600">
                    {selected.artifacts.map((artifact) => (
                      <li key={artifact}>• {artifact}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-text">Сильные стороны</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-brand-primary">
                    {selected.strengths.map((item) => (
                      <span key={item} className="rounded-full bg-brand-primary/10 px-3 py-1">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <p className="text-sm text-slate-600">
                  Люди, сильные в этом навыке:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-brand-text">
                  {edges
                    .filter((edge) => edge.target === selected.id)
                    .map((edge) => employees.find((emp) => emp.id === edge.source))
                    .filter(Boolean)
                    .map((emp) => (
                      <li key={emp!.id}>• {emp!.name} ({emp!.role})</li>
                    ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-600">Выберите сотрудника или навык, чтобы увидеть детали.</p>
        )}
      </Card>
    </div>
  );
}

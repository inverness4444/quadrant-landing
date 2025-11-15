import type { ReactNode } from "react";
import Card from "@/components/common/Card";

type MetricCardProps = {
  label: string;
  value: ReactNode;
  sublabel?: string;
};

export default function MetricCard({ label, value, sublabel }: MetricCardProps) {
  return (
    <Card className="flex flex-col gap-2">
      <p className="text-sm uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-3xl font-semibold text-brand-text">{value}</p>
      {sublabel && <p className="text-xs text-slate-500">{sublabel}</p>}
    </Card>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { Lead } from "@/drizzle/schema";

type LeadsTableProps = {
  initialLeads: Lead[];
};

export default function LeadsTable({ initialLeads }: LeadsTableProps) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const leads = useMemo(
    () =>
      [...initialLeads].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [initialLeads],
  );

  const toggleRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="overflow-x-auto rounded-3xl border border-brand-border bg-white shadow-sm">
      <table className="min-w-full divide-y divide-brand-border text-sm">
        <thead className="bg-brand-muted text-left text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Дата</th>
            <th className="px-4 py-3">Имя</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Компания</th>
            <th className="px-4 py-3">Размер</th>
            <th className="px-4 py-3">Сообщение</th>
            <th className="px-4 py-3">Статус</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-border text-slate-700">
          {leads.map((lead) => {
            const isRead = readIds.has(lead.id);
            return (
              <tr key={lead.id} className={lead.suspicious ? "bg-orange-50" : ""}>
                <td className="px-4 py-3">{new Date(lead.createdAt).toLocaleString("ru-RU")}</td>
                <td className="px-4 py-3">{lead.name}</td>
                <td className="px-4 py-3">{lead.email}</td>
                <td className="px-4 py-3">{lead.company}</td>
                <td className="px-4 py-3">{lead.headcount}</td>
                <td className="px-4 py-3">
                  {lead.message.length > 60
                    ? `${lead.message.slice(0, 57)}...`
                    : lead.message}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      isRead ? "bg-brand-muted text-slate-500" : "bg-brand-primary/10 text-brand-primary"
                    }`}
                    onClick={() => toggleRead(lead.id)}
                  >
                    {isRead ? "прочитан" : "новый"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

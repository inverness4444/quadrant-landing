import LeadsTable from "@/components/sections/admin/LeadsTable";
import { getLeads } from "@/repositories/leadRepository";
import SectionTitle from "@/components/common/SectionTitle";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quadrant — заявки",
  description: "Админка для просмотра заявок Quadrant.",
};

export default async function AdminPage() {
  const leads = await getLeads();
  return (
    <div className="space-y-6">
      <SectionTitle title="Заявки" subtitle="Последние лиды с сайта Quadrant." />
      <LeadsTable initialLeads={leads} />
    </div>
  );
}

import Card from "@/components/common/Card";
import SectionTitle from "@/components/common/SectionTitle";

export type RoleCard = {
  title: string;
  description: string;
};

type RolesSectionProps = {
  roles: RoleCard[];
};

export default function RolesSection({ roles }: RolesSectionProps) {
  return (
    <section className="space-y-6">
      <SectionTitle
        eyebrow="Кому полезен Quadrant"
        title="Платформа для разных ролей внутри компании"
        subtitle="Каждый видит только своё: тимлиды отслеживают экспертизу, HR — прогресс по навыкам, руководители — риски и масштабирование."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.title} className="space-y-3 p-6">
            <p className="text-lg font-semibold text-brand-text">{role.title}</p>
            <p className="text-sm text-slate-600">{role.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

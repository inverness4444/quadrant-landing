import Card from "@/components/common/Card";
import SectionTitle from "@/components/common/SectionTitle";

type Role = {
  title: string;
  points: string[];
};

type RolesSectionProps = {
  roles: Role[];
};

export default function RolesSection({ roles }: RolesSectionProps) {
  return (
    <section className="space-y-6">
      <SectionTitle
        title="Для кого Quadrant внутри компании"
        subtitle="Каждая роль получает свои инсайты: от тимлидов до C-level."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.title} className="space-y-3">
            <p className="text-lg font-semibold text-brand-text">{role.title}</p>
            <ul className="space-y-2 text-sm text-slate-600">
              {role.points.map((point) => (
                <li key={point} className="flex items-start gap-2">
                  <span>•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </section>
  );
}

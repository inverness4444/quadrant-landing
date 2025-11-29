import Card from "@/components/common/Card";
import SectionTitle from "@/components/common/SectionTitle";

export type SecurityPoint = {
  title: string;
  description: string;
};

type SecuritySectionProps = {
  points: SecurityPoint[];
};

export default function SecuritySection({ points }: SecuritySectionProps) {
  return (
    <section className="space-y-6">
      <SectionTitle
        eyebrow="Безопасность и приватность"
        title="Контроль за данными остаётся у вас"
        subtitle="Quadrant строит аналитику на ваших системах и уважает ограничения доступа. Все действия можно прозрачно аудитировать."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {points.map((point) => (
          <Card key={point.title} className="space-y-2 p-6">
            <p className="text-base font-semibold text-brand-text">{point.title}</p>
            <p className="text-sm text-slate-600">{point.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

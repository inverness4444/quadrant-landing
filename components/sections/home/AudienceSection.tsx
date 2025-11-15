import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import SectionTitle from "@/components/common/SectionTitle";
import type { AudienceColumn } from "@/types/content";

type AudienceSectionProps = {
  columns: AudienceColumn[];
};

export default function AudienceSection({ columns }: AudienceSectionProps) {
  return (
    <section className="space-y-6">
      <SectionTitle
        eyebrow="Для кого"
        title="Для компаний и специалистов"
        subtitle="Одна платформа для честного роста и прозрачных ожиданий."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {columns.map((column) => {
          const ButtonComponent =
            column.cta.variant === "secondary" ? SecondaryButton : PrimaryButton;
          return (
            <Card key={column.title}>
              <p className="text-lg font-semibold text-brand-text">
                {column.title}
              </p>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                {column.points.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <span>•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <ButtonComponent href={column.cta.href} className="mt-6">
                {column.cta.label}
              </ButtonComponent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

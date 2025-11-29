import Card from "@/components/common/Card";
import SectionTitle from "@/components/common/SectionTitle";

type IntegrationsSectionProps = {
  integrations: string[];
};

export default function IntegrationsSection({ integrations }: IntegrationsSectionProps) {
  return (
    <section className="space-y-6">
      <SectionTitle
        title="Интеграции"
        subtitle="Quadrant работает с вашими текущими инструментами — без миграций и сложных переходов."
      />
      <Card className="flex flex-wrap items-center gap-4 text-sm font-semibold text-brand-text">
        {integrations.map((integration) => (
          <span
            key={integration}
            className="inline-flex items-center rounded-full border border-white/70 bg-white px-4 py-2 text-sm shadow-sm"
          >
            {integration}
          </span>
        ))}
      </Card>
    </section>
  );
}

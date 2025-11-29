import Card from "@/components/common/Card";
import SectionTitle from "@/components/common/SectionTitle";

export type IntegrationItem = {
  title: string;
  subtitle: string;
  artifacts: string;
};

type IntegrationsSectionProps = {
  items: IntegrationItem[];
};

export default function IntegrationsSection({ items }: IntegrationsSectionProps) {
  return (
    <section className="space-y-6">
      <SectionTitle
        eyebrow="Интеграции"
        title="Подключаем привычные инструменты"
        subtitle="Quadrant берёт только рабочие артефакты — PR, задачи, документы и комментарии. Личные чаты и приватные заметки остаются нетронутыми."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.title} className="space-y-3 p-6">
            <p className="text-base font-semibold text-brand-text">{item.title}</p>
            <p className="text-sm text-slate-500">{item.subtitle}</p>
            <div className="rounded-2xl bg-brand-muted/60 px-4 py-3 text-xs text-slate-500">
              <p className="font-semibold uppercase tracking-wide text-slate-400">Берём</p>
              <p className="mt-1 text-sm text-brand-text">{item.artifacts}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

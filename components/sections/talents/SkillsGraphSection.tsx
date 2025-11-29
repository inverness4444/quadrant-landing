import Card from "@/components/common/Card";
import SectionTitle from "@/components/common/SectionTitle";

type SkillCluster = {
  title: string;
  skills: string[];
};

type Artifact = {
  title: string;
  tags: string[];
};

type SkillsGraphSectionProps = {
  clusters: SkillCluster[];
  artifacts: Artifact[];
  anchorId: string;
};

export default function SkillsGraphSection({ clusters, artifacts, anchorId }: SkillsGraphSectionProps) {
  return (
    <section className="space-y-6" id={anchorId}>
      <SectionTitle
        title="Граф навыков специалиста"
        subtitle="Quadrant связывает навыки с задачами, кодом и документами. Получается карта того, что вы реально делаете."
      />
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Группы навыков</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {clusters.map((cluster) => (
              <div key={cluster.title} className="rounded-2xl border border-white/60 bg-white/70 p-4">
                <p className="text-sm font-semibold text-brand-text">{cluster.title}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {cluster.skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-brand-muted/70 px-3 py-1 text-xs text-brand-text">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Недавние артефакты</p>
          <div className="space-y-3">
            {artifacts.map((artifact) => (
              <div key={artifact.title} className="rounded-2xl border border-white/60 bg-white/80 p-4">
                <p className="text-sm font-semibold text-brand-text">{artifact.title}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  {artifact.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-brand-muted/60 px-2 py-1">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

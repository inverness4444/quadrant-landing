import Card from "@/components/common/Card";
import SectionTitle from "@/components/common/SectionTitle";

type Problem = {
  title: string;
  description: string;
};

type ProblemsSectionProps = {
  problems: Problem[];
};

export default function ProblemsSection({ problems }: ProblemsSectionProps) {
  return (
    <section className="space-y-6">
      <SectionTitle
        title="Проблемы, которые решает Quadrant"
        subtitle="Видите реальные навыки и риски, а не только результаты формальных ревью."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {problems.map((problem) => (
          <Card key={problem.title} className="space-y-2">
            <p className="text-lg font-semibold text-brand-text">{problem.title}</p>
            <p className="text-sm text-slate-600">{problem.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

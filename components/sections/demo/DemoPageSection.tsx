import CareerTrack from "@/components/sections/demo/CareerTrack";
import TeamGraph from "@/components/sections/demo/TeamGraph";
import { demoCareerTracks, demoEmployees } from "@/content/demo";
import Card from "@/components/common/Card";

export default function DemoPageSection() {
  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Граф команды</p>
          <h2 className="text-3xl font-semibold text-brand-text">Как Quadrant видит сотрудников и навыки</h2>
          <p className="text-sm text-slate-600">
            Мы тянем артефакты из GitHub, Jira, Notion и связываем сотрудников с ключевыми навыками. Ниже — упрощённый граф на демо-данных.
          </p>
          <Card className="p-4 text-sm text-slate-500">
            <ul className="list-disc space-y-1 pl-5">
              <li>Кликаем узлы и видим, кто закрывает конкретный навык.</li>
              <li>Смотрим связность команды и риски bus factor.</li>
              <li>Находим людей, чей рост нужно поддержать.</li>
            </ul>
          </Card>
        </div>
        <TeamGraph />
      </section>

      <CareerTrack tracks={demoCareerTracks} employees={demoEmployees} />
    </div>
  );
}

import Card from "@/components/common/Card";
import SectionTitle from "@/components/common/SectionTitle";

type Track = {
  title: string;
  description: string;
  points: string[];
};

type GrowthTracksSectionProps = {
  tracks: Track[];
};

export default function GrowthTracksSection({ tracks }: GrowthTracksSectionProps) {
  return (
    <section className="space-y-6">
      <SectionTitle
        title="Треки развития"
        subtitle="Quadrant подсвечивает артефакты, которые помогают расти в выбранном направлении."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {tracks.map((track) => (
          <Card key={track.title} className="space-y-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Трек</p>
              <p className="text-lg font-semibold text-brand-text">{track.title}</p>
            </div>
            <p className="text-sm text-slate-600">{track.description}</p>
            <ul className="space-y-2 text-sm text-slate-600">
              {track.points.map((point) => (
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

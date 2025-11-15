import {
  demoCareerTracks,
  demoEdges,
  demoEmployees,
  demoSkills,
  type DemoCareerTrack,
  type DemoEdge,
  type DemoEmployee,
  type DemoSkill,
} from "@/content/demo";

export function getDemoData(): {
  employees: DemoEmployee[];
  skills: DemoSkill[];
  edges: DemoEdge[];
  tracks: DemoCareerTrack[];
} {
  return {
    employees: demoEmployees,
    skills: demoSkills,
    edges: demoEdges,
    tracks: demoCareerTracks,
  };
}

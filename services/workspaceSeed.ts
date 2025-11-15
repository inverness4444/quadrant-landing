import type { EmployeeLevel, SkillType } from "@/drizzle/schema";
import {
  createEmployee,
  listEmployees,
  type EmployeePayload,
} from "@/repositories/employeeRepository";
import { createSkill, listSkills } from "@/repositories/skillRepository";
import { createTrack, findTrackById, listTrackLevelsByWorkspace, listTracks } from "@/repositories/trackRepository";

const skillDefinitions: Array<{ name: string; type: SkillType }> = [
  { name: "Golang", type: "hard" },
  { name: "PostgreSQL", type: "data" },
  { name: "Kafka", type: "hard" },
  { name: "React", type: "hard" },
  { name: "TypeScript", type: "hard" },
  { name: "Product Discovery", type: "product" },
  { name: "Data Analysis", type: "data" },
  { name: "UX Research", type: "product" },
  { name: "Leadership", type: "soft" },
  { name: "Mentorship", type: "soft" },
  { name: "Python", type: "hard" },
  { name: "Storytelling", type: "soft" },
];

const trackDefinitions = [
  {
    name: "Backend Engineer",
    levels: [
      { name: "Junior", description: "Понимает основы языка и умеет править баги" },
      { name: "Middle", description: "Самостоятельно ведёт фичи, владеет архитектурой сервиса" },
      { name: "Senior", description: "Проектирует системы, менторит команду" },
    ],
  },
  {
    name: "Product Manager",
    levels: [
      { name: "Junior", description: "Собирает данные, помогает вести backlog" },
      { name: "Middle", description: "Ведёт stream, держит метрики продукта" },
      { name: "Senior", description: "Формирует стратегию, руководит продуктовыми командами" },
    ],
  },
  {
    name: "Data Analyst",
    levels: [
      { name: "Junior", description: "Готовит отчёты и базовую статистику" },
      { name: "Middle", description: "Проектирует модели, автоматизирует дашборды" },
      { name: "Senior", description: "Строит аналитическую культуру, ведёт крупные исследования" },
    ],
  },
];

const employeeDefinitions: Array<
  Omit<EmployeePayload, "skills" | "primaryTrackId" | "trackLevelId"> & {
    skills: Array<{ name: string; level: number }>;
    trackName?: string;
    trackLevel?: string;
  }
> = [
  {
    name: "Аня Коваль",
    position: "Lead Backend Engineer",
    level: "Senior",
    trackName: "Backend Engineer",
    trackLevel: "Senior",
    skills: [
      { name: "Golang", level: 5 },
      { name: "PostgreSQL", level: 4 },
      { name: "Kafka", level: 4 },
      { name: "Leadership", level: 4 },
    ],
  },
  {
    name: "Илья Миронов",
    position: "Backend Engineer",
    level: "Middle",
    trackName: "Backend Engineer",
    trackLevel: "Middle",
    skills: [
      { name: "Golang", level: 4 },
      { name: "PostgreSQL", level: 3 },
      { name: "Mentorship", level: 3 },
    ],
  },
  {
    name: "Мария Кравец",
    position: "Product Manager",
    level: "Senior",
    trackName: "Product Manager",
    trackLevel: "Senior",
    skills: [
      { name: "Product Discovery", level: 5 },
      { name: "Data Analysis", level: 4 },
      { name: "Storytelling", level: 4 },
    ],
  },
  {
    name: "Владлена Ли",
    position: "Product Designer",
    level: "Middle",
    skills: [
      { name: "UX Research", level: 4 },
      { name: "Storytelling", level: 3 },
      { name: "TypeScript", level: 2 },
    ],
  },
  {
    name: "Глеб Орлов",
    position: "Data Analyst",
    level: "Middle",
    trackName: "Data Analyst",
    trackLevel: "Middle",
    skills: [
      { name: "Python", level: 4 },
      { name: "Data Analysis", level: 4 },
      { name: "PostgreSQL", level: 4 },
    ],
  },
  {
    name: "Света Нефёдова",
    position: "Frontend Engineer",
    level: "Junior",
    skills: [
      { name: "React", level: 3 },
      { name: "TypeScript", level: 3 },
      { name: "Mentorship", level: 2 },
    ],
  },
];

export async function seedWorkspaceDemoData(workspaceId: string) {
  const existingEmployees = await listEmployees(workspaceId);
  if (existingEmployees.length > 0) {
    return;
  }
  await seedSkills(workspaceId);
  await seedTracks(workspaceId);

  const [skillList, trackList, trackLevelList] = await Promise.all([
    listSkills(workspaceId),
    listTracks(workspaceId),
    listTrackLevelsByWorkspace(workspaceId),
  ]);

  const skillMap = new Map(skillList.map((skill) => [skill.name, skill]));
  const trackMap = new Map(trackList.map((track) => [track.name, track]));
  const trackLevelMap = new Map<string, string>();
  trackLevelList.forEach((level) => {
    trackLevelMap.set(`${level.trackId}:${level.name}`, level.id);
  });

  for (const definition of employeeDefinitions) {
    const skillsPayload =
      definition.skills
        .map((item) => {
          const skill = skillMap.get(item.name);
          return skill ? { skillId: skill.id, level: item.level } : null;
        })
        .filter(Boolean) ?? [];
    let trackLevelId: string | undefined;
    let primaryTrackId: string | undefined;
    if (definition.trackName) {
      const track = trackMap.get(definition.trackName);
      if (track) {
        primaryTrackId = track.id;
        if (definition.trackLevel) {
          const levelId = trackLevelMap.get(`${track.id}:${definition.trackLevel}`);
          if (levelId) {
            trackLevelId = levelId;
          }
        }
      }
    }
    await createEmployee(workspaceId, {
      name: definition.name,
      position: definition.position,
      level: definition.level as EmployeeLevel,
      primaryTrackId,
      trackLevelId,
      skills: skillsPayload as Array<{ skillId: string; level: number }>,
    });
  }
}

async function seedSkills(workspaceId: string) {
  const existing = await listSkills(workspaceId);
  const names = new Set(existing.map((skill) => skill.name.toLowerCase()));
  for (const definition of skillDefinitions) {
    if (names.has(definition.name.toLowerCase())) continue;
    await createSkill(workspaceId, definition);
  }
}

async function seedTracks(workspaceId: string) {
  const existing = await listTracks(workspaceId);
  const names = new Set(existing.map((track) => track.name.toLowerCase()));
  for (const definition of trackDefinitions) {
    if (names.has(definition.name.toLowerCase())) continue;
    await createTrack(workspaceId, definition);
  }
}

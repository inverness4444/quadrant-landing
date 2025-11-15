export type DemoEmployee = {
  id: string;
  name: string;
  role: string;
  team: string;
  grade: "Junior" | "Middle" | "Senior";
  artifacts: string[];
  strengths: string[];
};

export type DemoSkill = {
  id: string;
  label: string;
};

export type DemoEdge = {
  source: string;
  target: string;
  weight?: number;
};

export type DemoCareerStep = {
  level: string;
  description: string;
  completed: boolean;
};

export type DemoCareerTrack = {
  employeeId: string;
  steps: DemoCareerStep[];
};

export const demoEmployees: DemoEmployee[] = [
  {
    id: "e-anna",
    name: "Аня",
    role: "Backend Engineer",
    team: "Payments",
    grade: "Senior",
    artifacts: ["PR #1243", "ADR: Service Mesh", "Incident RCA"],
    strengths: ["Golang", "PostgreSQL", "Архитектура"],
  },
  {
    id: "e-ilya",
    name: "Илья",
    role: "Data Scientist",
    team: "Insights",
    grade: "Middle",
    artifacts: ["Модель churn v2", "Notion: Data Contracts"],
    strengths: ["Python", "Data Analysis", "ML"],
  },
  {
    id: "e-maria",
    name: "Мария",
    role: "Product Manager",
    team: "Growth",
    grade: "Senior",
    artifacts: ["PRD: Referral 3.0", "Jira Epic Q1"],
    strengths: ["Product Discovery", "A/B Tests", "Коммуникация"],
  },
  {
    id: "e-nikita",
    name: "Никита",
    role: "Frontend Engineer",
    team: "Console",
    grade: "Middle",
    artifacts: ["Feature Flag Panel", "Design System RFC"],
    strengths: ["React", "TypeScript", "Design Systems"],
  },
];

export const demoSkills: DemoSkill[] = [
  { id: "s-golang", label: "Golang" },
  { id: "s-postgres", label: "PostgreSQL" },
  { id: "s-ml", label: "ML" },
  { id: "s-data", label: "Data Analysis" },
  { id: "s-product", label: "Product Discovery" },
  { id: "s-growth", label: "Growth Experiments" },
  { id: "s-react", label: "React" },
  { id: "s-typescript", label: "TypeScript" },
];

export const demoEdges: DemoEdge[] = [
  { source: "e-anna", target: "s-golang", weight: 3 },
  { source: "e-anna", target: "s-postgres", weight: 2 },
  { source: "e-ilya", target: "s-ml", weight: 2 },
  { source: "e-ilya", target: "s-data", weight: 3 },
  { source: "e-maria", target: "s-product", weight: 3 },
  { source: "e-maria", target: "s-growth", weight: 2 },
  { source: "e-nikita", target: "s-react", weight: 3 },
  { source: "e-nikita", target: "s-typescript", weight: 3 },
  { source: "e-anna", target: "e-maria", weight: 1 },
];

export const demoCareerTracks: DemoCareerTrack[] = [
  {
    employeeId: "e-ilya",
    steps: [
      {
        level: "Junior",
        description: "Стабильно закрывает задачники и пишет reproducible notebooks",
        completed: true,
      },
      {
        level: "Middle",
        description: "Документирует модели, ведёт A/B эксперименты",
        completed: true,
      },
      {
        level: "Senior",
        description: "Ведёт MLOps, менторит команду, задаёт стандарты качества",
        completed: false,
      },
    ],
  },
  {
    employeeId: "e-nikita",
    steps: [
      {
        level: "Junior",
        description: "Пишет UI-фичи по спецификации, покрывает тестами",
        completed: true,
      },
      {
        level: "Middle",
        description: "Ведёт дизайн-систему, разбирается в DX",
        completed: false,
      },
      {
        level: "Senior",
        description: "Отвечает за фронтовую архитектуру, обучает других",
        completed: false,
      },
    ],
  },
];

import type { BenefitCard, HeroContent } from "@/types/content";

export const talentsHero: HeroContent = {
  eyebrow: "для специалистов",
  title: "Quadrant для специалистов",
  subtitle:
    "Видите, за что растёте, какие навыки уже на новом уровне и что стоит усилить, чтобы получить промо.",
};

export const talentCards: BenefitCard[] = [
  {
    title: "Текущий уровень",
    description:
      "Quadrant показывает, к какому грейду вы ближе всего, и фиксирует ожидания по каждой компетенции.",
  },
  {
    title: "Какие навыки тянут вверх",
    description:
      "Сравниваем вас с требованиями более высокого уровня и подсвечиваем навыки, которые уже сильные.",
  },
  {
    title: "Какие артефакты улучшить",
    description:
      "Подсказываем, где стоит прокачаться: код-ревью, документация, участие в инициативах.",
  },
];

export const growthPath = [
  {
    title: "Junior → Middle",
    description: "Стабильно закрываете задачи, участвуете в код-ревью, знаете архитектуру.",
  },
  {
    title: "Middle → Senior",
    description: "Влияете на решения, ведёте эксперименты, участвуете в менторстве.",
  },
  {
    title: "Senior → Lead",
    description: "Отвечаете за архитектуру, развиваете людей, ведёте cross-team инициативы.",
  },
  {
    title: "Lead → Head",
    description: "Работаете с несколькими командами, следите за метриками и стратегией.",
  },
];

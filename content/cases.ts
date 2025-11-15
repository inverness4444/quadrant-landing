export type CaseStudyCard = {
  id: string;
  company: string;
  industry: string;
  before: string;
  after: string;
  metrics: string[];
};

export const caseStudies: CaseStudyCard[] = [
  {
    id: "nova-bank",
    company: "Nova Bank",
    industry: "Финтех",
    before: "Неочевидные кандидаты на роль тимлидов, промо затягивалось на 6+ месяцев.",
    after:
      "Quadrant подсветил 4 специалистов, готовых вести команды, время на промо сократилось до 2 месяцев.",
    metrics: ["-35% времени на performance-review", "+3 внутренних промо"],
  },
  {
    id: "orbit-games",
    company: "Orbit Games",
    industry: "Игровая индустрия",
    before: "Команды жаловались на «стеклянный потолок», высокий отток middle специалистов.",
    after:
      "Запустили 12 квестов между командами, удержали 5 ключевых инженеров и ускорили релиз на 15%.",
    metrics: ["-20% добровольного ухода", "+15% скорость релизов"],
  },
  {
    id: "metrocloud",
    company: "MetroCloud",
    industry: "SaaS",
    before: "Не было прозрачной карты навыков, обучение покупали вслепую.",
    after:
      "Quadrant показал реальный граф компетенций и помог сфокусировать бюджет обучения на нужных ролях.",
    metrics: ["-25% бюджета на внешнее обучение", "+18 внутренних ротаций"],
  },
];

export const detailedCases = [
  {
    id: "nova-bank",
    title: "Nova Bank — растим тимлидов внутри команды",
    sections: [
      {
        heading: "Исходные данные",
        text: "Команда разработки выросла до 120 человек, но тимлидов не хватало. Performance-review занимал до 4 месяцев.",
      },
      {
        heading: "Что сделали",
        text: "Подключили GitHub, Jira и Confluence, построили граф навыков по инженерным трекам, запустили 8 квестов.",
      },
      {
        heading: "Результат",
        text: "Нашли 4 специалистов, готовых к роли тимлида, ускорили промо и снизили время релиза ключевого продукта на 10%.",
      },
    ],
  },
];

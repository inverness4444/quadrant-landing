import { ru } from "@/locales/ru";
import { en } from "@/locales/en";

const dictionaries = {
  ru,
  en,
};

export type Locale = keyof typeof dictionaries;
export type Dictionary = (typeof dictionaries)["ru"];

export function getDictionary(locale: string | null | undefined): Dictionary {
  if (locale && locale in dictionaries) {
    return dictionaries[locale as Locale];
  }
  return dictionaries.ru;
}

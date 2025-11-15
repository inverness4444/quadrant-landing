"use client";

import { useSearchParams } from "next/navigation";
import { getDictionary } from "@/lib/i18n";

export function useDictionary() {
  const searchParams = useSearchParams();
  const lang = searchParams.get("lang");
  return getDictionary(lang);
}

export function useLocale() {
  const searchParams = useSearchParams();
  return searchParams.get("lang") ?? "ru";
}

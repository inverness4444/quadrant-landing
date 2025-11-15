"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type LanguageSwitcherProps = {
  className?: string;
};

export default function LanguageSwitcher({ className }: LanguageSwitcherProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const lang = searchParams.get("lang") ?? "ru";

  const switchTo = (target: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (target === "ru") {
      params.delete("lang");
    } else {
      params.set("lang", target);
    }
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`);
  };

  return (
    <div
      className={`${className ?? "hidden lg:flex"} items-center gap-2 text-xs font-semibold text-slate-500`}
    >
      <button
        type="button"
        className={`transition ${lang === "ru" ? "text-brand-text" : "text-slate-400"}`}
        onClick={() => switchTo("ru")}
      >
        RU
      </button>
      <span className="text-slate-400">|</span>
      <button
        type="button"
        className={`transition ${lang === "en" ? "text-brand-text" : "text-slate-400"}`}
        onClick={() => switchTo("en")}
      >
        EN
      </button>
    </div>
  );
}

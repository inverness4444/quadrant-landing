"use client";

import type { ReactNode } from "react";

type TagProps = {
  children: ReactNode;
  variant?: "default" | "outline";
  className?: string;
  onClick?: () => void;
};

export default function Tag({
  children,
  variant = "default",
  className = "",
  onClick,
}: TagProps) {
  const base =
    variant === "outline"
      ? "border border-brand-border bg-white text-slate-600"
      : "bg-brand-muted text-slate-700";
  const classes = [
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-200",
    base,
  ];
  if (className) classes.push(className);
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${classes.join(" ")} focus-visible:outline focus-visible:outline-2`}
      >
        {children}
      </button>
    );
  }
  return <span className={classes.join(" ")}>{children}</span>;
}

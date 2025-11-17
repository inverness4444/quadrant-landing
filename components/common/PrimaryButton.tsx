"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type BaseProps = {
  children: ReactNode;
  href?: string;
  className?: string;
  variant?: "primary" | "secondary";
};

type ButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement>;

export default function PrimaryButton({
  children,
  href,
  className = "",
  variant = "primary",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60";
  const variantClasses =
    variant === "secondary"
      ? "border border-brand-border bg-white text-brand-primary hover:bg-brand-muted"
      : "bg-brand-primary text-white hover:bg-brand-accent";
  const classes = [base, variantClasses, className].filter(Boolean).join(" ");

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}

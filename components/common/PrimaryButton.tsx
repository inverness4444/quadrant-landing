"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type BaseProps = {
  children: ReactNode;
  href?: string;
  className?: string;
};

type ButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement>;

export default function PrimaryButton({
  children,
  href,
  className = "",
  ...props
}: ButtonProps) {
  const classes = [
    "inline-flex h-12 items-center justify-center rounded-full bg-brand-primary px-6 text-sm font-semibold text-white transition-all duration-200 hover:bg-brand-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60",
  ];
  if (className) classes.push(className);

  if (href) {
    return (
      <Link href={href} className={classes.join(" ")}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes.join(" ")} {...props}>
      {children}
    </button>
  );
}

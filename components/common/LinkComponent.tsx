"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

export type LinkComponentProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  className?: string;
};

export default function LinkComponent({ href, children, className = "", ...props }: LinkComponentProps) {
  const classes = ["inline-flex", className].filter(Boolean).join(" ");
  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}

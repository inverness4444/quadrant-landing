"use client";

import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import LinkComponent from "@/components/common/LinkComponent";
import { cn } from "@/lib/cn";

type BaseProps = {
  children: ReactNode;
  className?: string;
};

type AnchorProps = {
  href: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className" | "href">;

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">;

type PrimaryButtonProps = BaseProps & (AnchorProps | ButtonProps);

const PRIMARY_BASE_CLASSES =
  "inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-brand-primary to-brand-accent px-6 text-sm transition-all duration-200 shadow-[0_15px_45px_rgba(93,95,239,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-50";

const TEXT_CLASS_PATTERN = /^!?text-/;

function sanitizeClassName(className?: string) {
  if (!className) {
    return undefined;
  }

  const filtered = className
    .split(/\s+/)
    .filter((token) => token && !TEXT_CLASS_PATTERN.test(token))
    .join(" ")
    .trim();

  return filtered || undefined;
}

export default function PrimaryButton({ children, className, ...rest }: PrimaryButtonProps) {
  const sanitizedClassName = sanitizeClassName(className);
  const classes = cn(PRIMARY_BASE_CLASSES, sanitizedClassName, "text-white font-medium");

  if ("href" in rest) {
    const { href, ...anchorProps } = rest as AnchorProps;
    return (
      <LinkComponent href={href} className={classes} {...anchorProps}>
        {children}
      </LinkComponent>
    );
  }

  const { type, ...buttonProps } = rest as ButtonProps & { type?: ButtonHTMLAttributes<HTMLButtonElement>["type"] };
  return (
    <button type={type ?? "button"} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}

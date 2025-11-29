"use client";

import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import LinkComponent from "@/components/common/LinkComponent";

type BaseProps = {
  children: ReactNode;
  className?: string;
};

type AnchorProps = {
  href: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className" | "href">;

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">;

type SecondaryButtonProps = BaseProps & (AnchorProps | ButtonProps);

const SECONDARY_BASE_CLASSES =
  "inline-flex h-11 items-center justify-center rounded-full border border-brand-border/70 bg-white/80 px-6 text-sm font-semibold shadow-sm transition-all duration-200 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-50";

export default function SecondaryButton({ children, className = "", ...rest }: SecondaryButtonProps) {
  const classes = [SECONDARY_BASE_CLASSES, className, "text-brand-primary"]
    .filter(Boolean)
    .join(" ");

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

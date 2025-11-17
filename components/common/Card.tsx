import type { HTMLAttributes, ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

export default function Card({ children, className = "", ...rest }: CardProps) {
  const classes = [
    "rounded-3xl border border-brand-border bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
  ];
  if (className) classes.push(className);
  return (
    <div className={classes.join(" ")} {...rest}>
      {children}
    </div>
  );
}

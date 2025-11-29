import type { HTMLAttributes, ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

export default function Card({ children, className = "", ...rest }: CardProps) {
  const classes = [
    "rounded-3xl border border-white/60 bg-white/90 p-6 shadow-[0_25px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_35px_80px_rgba(15,23,42,0.12)]",
  ];
  if (className) classes.push(className);
  return (
    <div className={classes.join(" ")} {...rest}>
      {children}
    </div>
  );
}

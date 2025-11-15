type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
};

export default function SectionTitle({
  eyebrow,
  title,
  subtitle,
  align = "left",
}: SectionTitleProps) {
  const classes = [
    "space-y-3",
    align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl",
  ];
  return (
    <div className={classes.join(" ")}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-semibold leading-tight text-brand-text sm:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="text-lg text-slate-600">{subtitle}</p>}
    </div>
  );
}

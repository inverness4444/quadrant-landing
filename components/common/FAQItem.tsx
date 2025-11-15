"use client";

import { useEffect, useRef, useState } from "react";

type FAQItemProps = {
  question: string;
  answer: string;
};

export default function FAQItem({ question, answer }: FAQItemProps) {
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = contentRef.current;
    if (!section) return;
    if (open) {
      setHeight(section.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [open]);

  return (
    <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left text-lg font-semibold text-brand-text"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span>{question}</span>
        <span
          className={`text-2xl text-brand-primary transition-transform duration-200 ${
            open ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>
      <div
        ref={contentRef}
        className="overflow-hidden text-sm text-slate-600 transition-all duration-300"
        style={{ maxHeight: height }}
      >
        <p className="mt-3">{answer}</p>
      </div>
    </div>
  );
}
